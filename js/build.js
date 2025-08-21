// Register this widget instance
Fliplet.Widget.instance({
  name: "ai-feature",
  displayName: "AI feature",
  render: {
    template: `<div class="ai-feature-content">
                <div class="ai-placeholder-container" style="display: none;">
                  <div class="ai-placeholder-content">
                    <h3 class="ai-placeholder-title">Create with AI</h3>
                    <p class="ai-placeholder-description">Click to describe what you want and let AI build it for you.</p>
                  </div>
                  <div class="ai-placeholder-cta">
                    <span class="ai-cta-text">Start here</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div class="ai-demo-container" style="display: none;">
                  <div class="ai-demo-header">
                    <h2 class="ai-demo-title">Generate any feature with AI</h2>
                  </div>
                  <div class="ai-demo-prompt-section">
                    <div class="ai-demo-input-container">
                      <input type="text" class="ai-demo-input" value="generate a tax calculator for US" readonly>
                      <button class="ai-demo-submit-btn">
                        <i class="fa fa-paper-plane-o" aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>
                  <div class="ai-demo-result">
                    <div class="ai-demo-component">
                      <h3 class="component-title">Tax Calculator</h3>
                      <div class="form-group">
                        <label class="form-label">Annual Income</label>
                        <input type="text" class="form-input" value="$75,000" readonly>
                      </div>
                      <div class="form-group">
                        <label class="form-label">Filing Status</label>
                        <select class="form-select" disabled>
                          <option>Single</option>
                        </select>
                      </div>
                      <div class="form-group">
                        <label class="form-label">Standard Deduction</label>
                        <input type="text" class="form-input" value="$13,850" readonly>
                      </div>
                      <div class="result-row">
                        <div class="result-item">
                          <label class="result-label">Federal Tax</label>
                          <div class="result-value">$9,235</div>
                        </div>
                        <div class="result-item">
                          <label class="result-label">After Tax</label>
                          <div class="result-value">$65,765</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>`,
    ready: function () {
      // Initialize children components when this widget is ready
      Fliplet.Widget.initializeChildren(this.$el, this);

      const AI = this;
      const appId = Fliplet.Env.get("appId");
      const pageId = Fliplet.Env.get("pageId");
      const organizationId = Fliplet.Env.get("organizationId");
      const userId = Fliplet.Env.get("user")?.id || "";
      const widgetId = AI.fields.aiFeatureId;
      const data = Fliplet.Widget.getData(widgetId);

      if (Fliplet.Env.get("mode") == "interact") {
        $(".ai-feature-content").show();
        $(".ai-placeholder-container").show();
        $(".ai-demo-container").hide();
      } else if (!data.layoutHTML) {
        $(".ai-feature-content").show();
        $(".ai-demo-container").show();
        $(".ai-placeholder-container").hide();
      } else {
        $(".ai-feature-content").hide();
      }

      AI.fields = _.assign(
        {
          dataSourceId: "",
          prompt: "",
          css: "",
          javascript: "",
          layoutHTML: "",
          regenerateCode: false,
        },
        AI.fields
      );
     
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

      if (!AI.fields.prompt || !AI.fields.regenerateCode) {
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
          const logAiCallResponse = await logAiCall({
            prompt: AI.fields.prompt,
            aiCssResponse: AI.fields.css,
            aiJsResponse: AI.fields.javascript,
            aiLayoutResponse: AI.fields.layoutHTML,
            organizationId: organizationId,
            pageId: pageId,
            widgetId: widgetId,
            appId: appId
          });

          // reload page preview
          Fliplet.Studio.emit("reload-page-preview");

          return { settingsResponse, layoutResponse, logAiCallResponse };
        } catch (error) {
          throw error;
        }
      }

      function injectHtmlCode(currentSettings) {
        // code from AI
        var codeGenContainer = `<div class="ai-feature-${widgetId}">${parsedContent.layoutHTML}</div>`;
        // Wrap response inside a temporary container
        let $wrapper = $("<div>").html(currentSettings.page.richLayout);
        // remove existing ai feature container
        $wrapper.find(`.ai-feature-${widgetId}`).remove();
        // Find `<fl-ai-feature>` and add a sibling after it
        $wrapper.find(`fl-ai-feature[cid="${widgetId}"]`).after(codeGenContainer);
        return $wrapper.html();
      }

      function removeHtmlCode(currentSettings) {
        let $wrapper = $("<div>").html(currentSettings.page.richLayout);
        // remove existing ai feature container
        $wrapper.find(`.ai-feature-${widgetId}`).remove();
        return $wrapper.html();
      }

      function logAiCall(data) {
        return Fliplet.App.Logs.create({
          data: {
            data: data,
            userId: userId,
            appId: appId,
            organizationId: organizationId,
          },
        }, "ai.feature.component");
      }

      function updateCodeWithinDelimiters(type, newCode, oldCode = "") {
        let start, end;

        if (type == "js") {
          start = `// start-ai-feature ${widgetId}`;
          end = `// end-ai-feature ${widgetId}`;
        } else {
          start = `/* start-ai-feature ${widgetId} */`;
          end = `/* end-ai-feature ${widgetId} */`;
        }

        // Check if delimiters exist in the old code
        if (oldCode.includes(start) && oldCode.includes(end)) {
          // Replace content between delimiters
          return oldCode.replace(
            new RegExp(start + "[\\s\\S]*?" + end, "g"),
            start + "\n" + newCode + "\n" + end
          );
        } else {
          // Append new code with delimiters at the end
          return oldCode + "\n\n" + start + "\n" + newCode + "\n" + end;
        }
      }

      function removeCodeWithinDelimiters(type, oldCode = "") {
        let start, end;

        if (type == "js") {
          start = `// start-ai-feature ${widgetId}`;
          end = `// end-ai-feature ${widgetId}`;
        } else {
          // For CSS, we need to escape the special characters properly
          start = `/\\* start-ai-feature ${widgetId} \\*/`;
          end = `/\\* end-ai-feature ${widgetId} \\*/`;
        }

        // Create the pattern and escape the string properly
        const pattern = new RegExp(`${start}[\\s\\S]*?${end}`, "g");

        // Remove the delimited code and clean up whitespace
        return oldCode
          .replace(pattern, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      }

      var parsedContent = {
        css: AI.fields.css,
        javascript: AI.fields.javascript,
        layoutHTML: AI.fields.layoutHTML,
      };

      if (AI.fields.css && AI.fields.javascript && AI.fields.layoutHTML) {
        saveGeneratedCode(parsedContent);
      }
    },
  },
});
