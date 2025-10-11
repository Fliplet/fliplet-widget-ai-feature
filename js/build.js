// Register this widget instance
Fliplet.Widget.instance({
  name: "ai-feature-infinite",
  displayName: "AI feature infinite",
  render: {
    template: `<div class="ai-feature-content" data-ai-feature-widget="true">
                <div class="well text-center">AI feature</div>
              </div>`,
    ready: function () {
      // Initialize children components when this widget is ready
      Fliplet.Widget.initializeChildren(this.$el, this);

      const AI = this;
      const appId = Fliplet.Env.get("appId");
      const pageId = Fliplet.Env.get("pageId");
      const organizationId = Fliplet.Env.get("organizationId");
      const userId = Fliplet.Env.get("user")?.id || "";

      if (Fliplet.Env.get("mode") == "interact") {
        $(".ai-feature-content").show();
      } else {
        $(".ai-feature-content").hide();
      }

      AI.fields = _.assign(
        {
          dataSourceId: "",
          css: "",
          javascript: "",
          layoutHTML: "",
          regenerateCode: false,
        },
        AI.fields
      );

      const widgetId = AI.fields.aiFeatureId;

      Fliplet.Hooks.on("componentEvent", async function (event) {
        if (
          event?.type == "removed" &&
          widgetId == event?.removed[0]?.widgetId
        ) {
          var currentSettings = await getCurrentPageSettings();

          var removedHtml = removeHtmlCode(currentSettings);

          const layoutResponse = await saveLayout(removedHtml);

          const removedCss = removeCodeWithinDelimiters(
            "css",
            currentSettings.page.settings.customSCSS
          );
          const removedJs = removeCodeWithinDelimiters(
            "js",
            currentSettings.page.settings.customJS
          );
          const saved = saveCssAndJs(removedCss, removedJs);

          // reload page preview
          Fliplet.Studio.emit("reload-page-preview");

          return { removedHtml, layoutResponse };
        }
      });

      if (!AI.fields.regenerateCode) {
        return;
      }

      async function getCurrentPageSettings() {
        return await Fliplet.API.request({
          url: `v1/apps/${appId}/pages/${pageId}?richLayout`,
          method: "GET",
        }).catch((error) => {
          return Fliplet.UI.Toast("Error getting current settings: " + error);
        });
      }

      async function saveCssAndJs(css, js) {
        var response = await Fliplet.API.request({
          url: `v1/apps/${appId}/pages/${pageId}/settings`,
          method: "POST",
          data: {
            customSCSS: css, // Inject CSS code
            customJS: js, // Inject JavaScript code
          },
        });

        return response;
      }

      async function saveLayout(html) {
        return await Fliplet.API.request({
          url: `v1/apps/${appId}/pages/${pageId}/rich-layout`,
          method: "PUT",
          data: { richLayout: html },
        });
      }

      async function saveGeneratedCode(parsedContent) {
        try {
          // get current page settings
          const currentSettings = await getCurrentPageSettings();

          // Save CSS and JavaScript
          const settingsResponse = await saveCssAndJs(
            updateCodeWithinDelimiters(
              "css",
              parsedContent.css,
              currentSettings.page.settings.customSCSS
            ), // Inject CSS code
            updateCodeWithinDelimiters(
              "js",
              parsedContent.javascript,
              currentSettings.page.settings.customJS
            )
          );

          const htmlCodeToInject = injectHtmlCode(currentSettings);

          const layoutResponse = await saveLayout(htmlCodeToInject);

          // save logs
          const logAiComponentUsageResponse = await logAiComponentUsage({
            aiCssResponse: AI.fields.css,
            aiJsResponse: AI.fields.javascript,
            aiLayoutResponse: AI.fields.layoutHTML,
            widgetId: widgetId,
            type: "code-save",
          });

          // reload page preview
          Fliplet.Studio.emit("reload-page-preview");

          return {
            settingsResponse,
            layoutResponse,
            logAiComponentUsageResponse,
          };
        } catch (error) {
          throw error;
        }
      }

      function injectHtmlCode(currentSettings) {
        console.log('[AI Feature] injectHtmlCode called with widgetId:', widgetId);
        // code from AI
        var html = parsedContent.layoutHTML || '';
        console.log('[AI Feature] HTML to inject length:', html.length);
        // Normalize if a full document came through: take only body content
        try {
          var bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
          if (bodyMatch && bodyMatch[1]) {
            html = bodyMatch[1];
          } else {
            html = html.replace(/<head[\s\S]*?<\/head>/gi, '');
            html = html.replace(/<\/?html[^>]*>/gi, '');
            html = html.replace(/<\/?body[^>]*>/gi, '');
          }
        } catch (e) { /* noop */ }

        // Use the new infinite variant class to avoid conflicts
        var codeGenContainer = `<div class="ai-feature-infinite-${widgetId}">${html}</div>`;
        // Wrap response inside a temporary container
        let $wrapper = $("<div>").html(currentSettings.page.richLayout);
        // remove existing ai feature container (both legacy and new)
        $wrapper.find(`.ai-feature-infinite-${widgetId}`).remove();
        $wrapper.find(`.ai-feature-${widgetId}`).remove();
        
        // Find the widget container by multiple possible selectors
        var $widgetContainer = $wrapper.find(`fl-ai-feature-infinite[cid="${widgetId}"]`);
        if (!$widgetContainer.length) {
          // Fallback: try finding by data attribute
          $widgetContainer = $wrapper.find(`[data-ai-feature-widget="true"]`).filter(function() {
            // Make sure we find the right instance by checking nearby widget markers
            return $(this).closest('[data-widget-package="com.fliplet.ai-feature-infinite"]').length > 0 ||
                   $(this).parent().attr('data-widget-id') == widgetId ||
                   $(this).parent().attr('cid') == widgetId;
          }).first();
        }
        if (!$widgetContainer.length) {
          // Last fallback: find any div with our template content
          $widgetContainer = $wrapper.find('.ai-feature-content[data-ai-feature-widget="true"]').first();
        }
        
        if ($widgetContainer.length) {
          console.log('[AI Feature] Found widget container, injecting code');
          $widgetContainer.after(codeGenContainer);
        } else {
          console.warn('[AI Feature] Could not find widget container to inject code. Widget ID:', widgetId);
          console.warn('[AI Feature] Available elements:', {
            customTags: $wrapper.find('fl-ai-feature-infinite').length,
            dataAttr: $wrapper.find('[data-ai-feature-widget]').length,
            aiFeatureContent: $wrapper.find('.ai-feature-content').length
          });
        }
        
        return $wrapper.html();
      }

      function removeHtmlCode(currentSettings) {
        let $wrapper = $("<div>").html(currentSettings.page.richLayout);
        // remove existing ai feature container
        $wrapper.find(`.ai-feature-${widgetId}`).remove();
        return $wrapper.html();
      }

      function logAiComponentUsage(data) {
        return Fliplet.App.Logs.create(
          {
            data: {
              ...data,
              version: "2.0.0",
              pageId,
            },
          },
          "ai.feature.component"
        );
      }

      function updateCodeWithinDelimiters(type, newCode, oldCode = "") {
        let start, end, patternStart, patternEnd;

        if (type == "js") {
          start = `// start-ai-feature ${widgetId}`;
          end = `// end-ai-feature ${widgetId}`;

          // Check if delimiters exist in the old code
          if (oldCode.includes(start) && oldCode.includes(end)) {
            // Replace content between delimiters
            // For CSS, we need to escape the special characters properly
            patternStart = start;
            patternEnd = end;

            return oldCode.replace(
              new RegExp(
                patternStart.replace(/[.*+?^${}()|[\]\\]/g, function (match) {
                  return "\\" + match;
                }) +
                  "[\\s\\S]*?" +
                  patternEnd.replace(/[.*+?^${}()|[\]\\]/g, function (match) {
                    return "\\" + match;
                  }),
                "g"
              ),
              function () {
                return start + "\n" + newCode + "\n" + end;
              }
            );
          } else {
            // Append new code with delimiters at the end
            return oldCode + "\n\n" + start + "\n" + newCode + "\n" + end;
          }
        } else {
          start = `/* start-ai-feature ${widgetId} */`;
          end = `/* end-ai-feature ${widgetId} */`;

          if (oldCode.includes(start) && oldCode.includes(end)) {
            // Replace content between delimiters
            // For CSS, we need to escape the special characters properly
            patternStart = `/\\* start-ai-feature ${widgetId} \\*/`;
            patternEnd = `/\\* end-ai-feature ${widgetId} \\*/`;

            return oldCode.replace(
              new RegExp(patternStart + "[\\s\\S]*?" + patternEnd, "g"),
              start + "\n" + newCode + "\n" + end
            );
          } else {
            // Append new code with delimiters at the end
            return oldCode + "\n\n" + start + "\n" + newCode + "\n" + end;
          }
        }
      }

      function removeCodeWithinDelimiters(type, oldCode = "") {
        // widgetId is assumed to be in scope; add it as a param if needed
        const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        let start, end;

        if (type === "js") {
          start = `// start-ai-feature ${widgetId}`;
          end = `// end-ai-feature ${widgetId}`;
        } else {
          // Keep CSS markers RAW, not pre-escaped; we'll escape them when building the RegExp
          start = `/* start-ai-feature ${widgetId} */`;
          end = `/* end-ai-feature ${widgetId} */`;
        }

        // Build a robust pattern:
        // - Escape start/end so they’re treated literally
        // - Match everything between them non-greedily, including newlines
        // - Also consume an optional leading indentation+newline and a trailing newline to avoid blank lines
        const pattern = new RegExp(
          `(?:^[ \\t]*\\r?\\n)?${esc(start)}[\\s\\S]*?${esc(end)}\\r?\\n?`,
          "gm"
        );

        return oldCode
          .replace(pattern, "")
          .replace(/\r?\n{3,}/g, "\n\n") // collapse excessive blank lines
          .trim();
      }

      var parsedContent = {
        css: AI.fields.css,
        javascript: AI.fields.javascript,
        layoutHTML: AI.fields.layoutHTML,
      };

      console.log('[AI Feature] Checking if should save code:', {
        hasCSS: !!AI.fields.css,
        hasJS: !!AI.fields.javascript,
        hasHTML: !!AI.fields.layoutHTML,
        regenerateCode: AI.fields.regenerateCode,
        widgetId: widgetId
      });

      if (AI.fields.css || AI.fields.javascript || AI.fields.layoutHTML) {
        console.log('[AI Feature] Saving generated code...');
        saveGeneratedCode(parsedContent);
      } else {
        console.log('[AI Feature] No code to save');
      }
    },
  },
});
