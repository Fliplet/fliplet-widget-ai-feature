// Register this widget instance
Fliplet.Widget.instance({
  name: "ai-feature",
  displayName: "AI feature",
  render: {
    template: `<div class="ai-feature-content">
                <div class="well text-center">AI feature</div>
              </div>`,
    ready: function () {
      // Initialize children components when this widget is ready
      Fliplet.Widget.initializeChildren(this.$el, this);


      // Helper function to get GUID from component
      function getGuidFromComponent() {
        return AI.fields.guid;
      }

      // Helper function to generate a new GUID
      function generateGuid() {
        return Fliplet.guid();
      }

      // Helper function to find components with the same GUID
      async function findComponentsWithSameGuid(currentGuid) {
        return $(`fl-helper[name="ai-feature"][data-guid="${currentGuid}"]`);
      }

      // Helper function to get developer options code
      async function getDeveloperOptionsCode() {
        var screenCode = await getCodeFromScreen();
        return {
          guid: AI.fields.guid,
          html: getHtmlCodeFromScreen(screenCode.html) || "",
          css: getCodeFromScreenWithoutComments("css", screenCode.css) || "",
          js: getCodeFromScreenWithoutComments("js", screenCode.js) || "",
        };
      }

      // Helper function to get hidden fields code
      function getHiddenFieldsCode() {
        return {
          html: AI.fields.layoutHTML || "",
          css: AI.fields.css || "",
          js: AI.fields.javascript || "",
        };
      }

      // Helper function to get code from screen
      async function getCodeFromScreen() {
        try {
          const currentSettings = await getCurrentPageSettings();
          return {
            html: currentSettings.page.richLayout || "",
            css: currentSettings.page.settings.customSCSS || "",
            js: currentSettings.page.settings.customJS || "",
          };
        } catch (error) {
          console.error("Error getting code from screen:", error);
          return { html: "", css: "", js: "" };
        }
      }

      // Helper function to save to hidden fields
      function saveToHiddenFields(code) {
        if (code.html) Fliplet.Helper.field("layoutHTML").set(code.html);
        if (code.css) Fliplet.Helper.field("css").set(code.css);
        if (code.js) Fliplet.Helper.field("javascript").set(code.js);
      }

      // Helper function to remove code from screen
      async function removeCodeFromScreen(guid) {
        try {
          const currentSettings = await getCurrentPageSettings();
          const removedHtml = removeHtmlCode(currentSettings);
          const removedCss = removeCodeWithinDelimiters(
            "css",
            currentSettings.page.settings.customSCSS
          );
          const removedJs = removeCodeWithinDelimiters(
            "js",
            currentSettings.page.settings.customJS
          );

          await saveLayout(removedHtml);
          await saveCssAndJs(removedCss, removedJs);
        } catch (error) {
          console.error("Error removing code from screen:", error);
        }
      }

      // Helper function to add code to screen
      async function addCodeToScreen(code, guid) {
        try {
          if (guid) {
            Fliplet.Helper.field("guid").set(guid);
          }

          const parsedContent = {
            css: code.css,
            javascript: code.js,
            layoutHTML: code.html,
          };

          await saveGeneratedCode(parsedContent);
        } catch (error) {
          console.error("Error adding code to screen:", error);
        }
      }

      // Helper function to rerender component
      function rerenderComponent() {
        Fliplet.Studio.emit("reload-page-preview");
      }

      // Helper function to compare code objects
      function compareCode(developerOptionsCode, hiddenFieldsCode) {
        return (
          developerOptionsCode.html === hiddenFieldsCode.html &&
          developerOptionsCode.css === hiddenFieldsCode.css &&
          developerOptionsCode.js === hiddenFieldsCode.js
        );
      }

      // Helper function to check if code is empty
      function isCodeEmpty(code) {
        return (
          (!code.html || code.html.trim() === "") &&
          (!code.css || code.css.trim() === "") &&
          (!code.js || code.js.trim() === "")
        );
      }

      // Main function to handle component GUID logic
      async function handleComponentGuid(component) {
        try {
          const currentGuid = getGuidFromComponent(component);

          // 1️⃣ NEW COMPONENT CASE
          if (!currentGuid) {
            // By default interface will create guid - do nothing - check build.js
            return;
          }

          // 2️⃣ EXISTING COMPONENT CASE
          const duplicates = await findComponentsWithSameGuid(currentGuid);

          debugger
          if (duplicates.length > 1) {
            // Duplicated GUIDs exist
            const developerOptionsCode = await getDeveloperOptionsCode();
            const hiddenFieldsCode = getHiddenFieldsCode();

            if (compareCode(developerOptionsCode, hiddenFieldsCode)) {
              const newGuid = generateGuid();
              await removeCodeFromScreen(currentGuid);
              await addCodeToScreen(hiddenFieldsCode, newGuid);
            } else {
              const screenCode = await getCodeFromScreen();
              saveToHiddenFields(screenCode);
              const newGuid = generateGuid();
              await removeCodeFromScreen(currentGuid);
              await addCodeToScreen(hiddenFieldsCode, newGuid);
            }
          } else {
            debugger
            // No duplicates
            const developerOptionsCode = await getDeveloperOptionsCode();
            const hiddenFieldsCode = getHiddenFieldsCode();

            if (compareCode(developerOptionsCode, hiddenFieldsCode)) {
              // DO NOTHING
              return;
            } else if (
              isCodeEmpty(developerOptionsCode) &&
              !isCodeEmpty(hiddenFieldsCode)
            ) {
              await addCodeToScreen(hiddenFieldsCode);
              saveToHiddenFields(hiddenFieldsCode);
              rerenderComponent();
            } else if (!compareCode(developerOptionsCode, hiddenFieldsCode)) {
              const screenCode = await getCodeFromScreen();
              saveToHiddenFields(screenCode);
              rerenderComponent();
            }
          }
        } catch (error) {
          debugger
          console.error("Error in handleComponentGuid:", error);
        }
      }


      const AI = this;
      const appId = Fliplet.Env.get("appId");
      const pageId = Fliplet.Env.get("pageId");
      const organizationId = Fliplet.Env.get("organizationId");
      const userId = Fliplet.Env.get("user")?.id || "";

      debugger;
      if (!AI.fields.guid) {
        AI.fields.guid = Fliplet.guid();
        return Fliplet.Widget.save(AI.fields).then(() => {
          Fliplet.Studio.emit("reload-widget-instance", AI.id);
          return;
        });
      } else {
        // Handle component GUID logic
        handleComponentGuid();
      }

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
        // code from AI
        var codeGenContainer = `<div class="ai-feature-${widgetId}">${parsedContent.layoutHTML}</div>`;
        // Wrap response inside a temporary container
        let $wrapper = $("<div>").html(currentSettings.page.richLayout);
        // remove existing ai feature container
        $wrapper.find(`.ai-feature-${widgetId}`).remove();
        // Find `<fl-ai-feature>` and add a sibling after it
        $wrapper
          .find(`fl-ai-feature[cid="${widgetId}"]`)
          .after(codeGenContainer);
        return $wrapper.html();
      }

      function getCssCodeFromScreen() {
        let $wrapper = $("<div>").html(currentSettings.page.richLayout);
        let codeWithComments = $wrapper.find(`.ai-feature-${widgetId}`).css();
        return codeWithComments;
      }

      function getCodeFromScreenWithoutComments(type, code) {
        // removeCodeWithinDelimiters
        const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (type === "js") {
          let start = `// start-ai-feature ${widgetId}`;
          let end = `// end-ai-feature ${widgetId}`;
          let pattern = new RegExp(esc(start) + "([\\s\\S]*?)" + esc(end), "g");
          let match = pattern.exec(code);
          let codeWithComments = match ? match[1] : "";
          return codeWithComments;
        } else if (type === "css") {
          let start = `/* start-ai-feature ${widgetId} */`;
          let end = `/* end-ai-feature ${widgetId} */`;
          let pattern = new RegExp(esc(start) + "([\\s\\S]*?)" + esc(end), "g");
          let match = pattern.exec(code);
          let codeWithComments = match ? match[1] : "";
          return codeWithComments;
        }
      }
      function getHtmlCodeFromScreen(html) {
        let $wrapper = $("<div>").html(html);
        let codeWithoutClass = $wrapper.find(`.ai-feature-${widgetId}`).html();
        return codeWithoutClass;
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

      if (AI.fields.css || AI.fields.javascript || AI.fields.layoutHTML) {
        saveGeneratedCode(parsedContent);
      }
    },
  },
});
