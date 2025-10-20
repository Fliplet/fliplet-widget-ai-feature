// Register this widget instance
Fliplet.Widget.instance({
  name: "ai-feature",
  displayName: "AI feature",
  render: {
    template: `<div class="ai-feature-content">
                <div class="well text-center">AI feature</div>
              </div>`,
    ready: async function () {
      // Initialize children components when this widget is ready
      Fliplet.Widget.initializeChildren(this.$el, this);

      const AI = this;
      const appId = Fliplet.Env.get("appId");
      const pageId = Fliplet.Env.get("pageId");

      if (Fliplet.Env.get("mode") == "interact") {
        $(".ai-feature-content").show();
      } else {
        $(".ai-feature-content").hide();
      }

      AI.fields = _.assign(
        {
          dataSourceId: "",
          dataSourceName: "",
          css: "",
          javascript: "",
          layoutHTML: "",
          regenerateCode: false,
          guid: "",
          chatHistory: ""
        },
        AI.fields
      );

      const widgetId = AI.fields.aiFeatureId;

      // Helper function to get GUID from component
      function getGuidFromComponent() {
        return AI.fields.guid;
      }

      // Helper function to generate a new GUID
      function generateGuid() {
        return Fliplet.guid();
      }

      // Helper function to find components with the same GUID
      async function findComponentsWithSameGuid() {
        return $(
          `fl-helper[name="ai-feature"][data-guid="${getGuidFromComponent()}"]`
        );
      }

      // Helper function to get developer options code
      async function getDeveloperOptionsCode() {
        var screenCode = await getCodeFromScreen();
        return {
          html: (getHtmlFromDeveloperOptions(screenCode.html) || "").trim(),
          css: (
            getCodeFromDeveloperOptionsWithoutComments("css", screenCode.css) || ""
          ).trim(),
          js: (
            getCodeFromDeveloperOptionsWithoutComments("js", screenCode.js) || ""
          ).trim(),
        };
      }

      // Helper function to get hidden fields code
      function getHiddenFieldsCode() {
        return {
          html: (AI.fields.layoutHTML || "").trim(),
          css: (AI.fields.css || "").trim(),
          js: (AI.fields.javascript || "").trim(),
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
            guid: AI.fields.guid || "",
          };
        } catch (error) {
          console.error("Error getting code from screen:", error);
          return { html: "", css: "", js: "", guid: "" };
        }
      }

      // Helper function to save to hidden fields
      async function saveToHiddenFields(code) {
        if (code.html) AI.fields.layoutHTML = code.html;
        if (code.css) AI.fields.css = code.css;
        if (code.js) AI.fields.javascript = code.js;
        if (code.guid) AI.fields.guid = code.guid;
        return await Fliplet.Widget.save(AI.fields, { id: widgetId });
      }

      // Helper function to remove code from screen
      async function removeCodeFromDeveloperOptions() {
        try {
          const currentSettings = await getCurrentPageSettings();
          const cleanedHtml = removeHtmlCode(currentSettings);
          const cleanedCss = removeCodeWithinDelimiters(
            "css",
            currentSettings.page.settings.customSCSS
          );
          const cleanedJs = removeCodeWithinDelimiters(
            "js",
            currentSettings.page.settings.customJS
          );

          await saveLayoutToDeveloperOptions(cleanedHtml);
          await saveCssAndJsToDeveloperOptions(cleanedCss, cleanedJs);
        } catch (error) {
          console.error("Error removing code from developer options:", error);
        }
      }

      // Helper function to add code to screen
      async function addCodeToDeveloperOptions(code) {
        try {
          const parsedContent = {
            css: code.css,
            javascript: code.js,
            layoutHTML: code.html,
          };

          await saveCodeWithWrapperToDeveloperOptions(parsedContent);
        } catch (error) {
          console.error("Error adding code to screen:", error);
        }
      }

      // Normalize whitespace for comparison
      function normalizeWhitespace(str) {
        return str ? str.replace(/\s+/g, " ").trim() : "";
      }

      // Helper function to compare code objects
      function isCodeEqual(developerOptionsCode, hiddenFieldsCode) {
        return (
          normalizeWhitespace(developerOptionsCode.html) ===
            normalizeWhitespace(hiddenFieldsCode.html) &&
          normalizeWhitespace(developerOptionsCode.css) ===
            normalizeWhitespace(hiddenFieldsCode.css) &&
          normalizeWhitespace(developerOptionsCode.js) ===
            normalizeWhitespace(hiddenFieldsCode.js)
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
      async function handleComponentGuid() {
        try {
          const currentGuid = getGuidFromComponent();
          // 2️⃣ EXISTING COMPONENT CASE
          const duplicates = await findComponentsWithSameGuid();
          const developerOptionsCode = await getDeveloperOptionsCode();
          const hiddenFieldsCode = getHiddenFieldsCode();

          if (duplicates.length > 1) {
            // there are duplicates, so we need to remove the code from developer options and add the new code with a new guid
            await removeCodeFromDeveloperOptions(); // removing code from developer options for the existing guid
            AI.fields.guid = generateGuid(); // generating a new guid
            await Fliplet.Widget.save(AI.fields, { id: widgetId }); // saving the new guid to the hidden fields
            Fliplet.Studio.emit("reload-page-preview"); // reloading the page preview
            return;
          } else if (isCodeEqual(developerOptionsCode, hiddenFieldsCode)) {
            // the code in developer options is the same as the hidden fields, so we need to do nothing
            return;
          } else { // there are no duplicates
            if (isCodeEmpty(developerOptionsCode)) {
              // developer options are empty, so we need to add the code from the hidden fields to the developer options
              await addCodeToDeveloperOptions(hiddenFieldsCode); // adding the code from the hidden fields to the developer options
              return;
            } else if (isCodeEmpty(hiddenFieldsCode)) {
              // hidden fields are empty, so we need to save the code from the developer options to the hidden fields
              await saveToHiddenFields({
                ...developerOptionsCode,
                guid: currentGuid,
              });
              Fliplet.Studio.emit("reload-page-preview"); // reloading the page preview
              return;
            } else {
              // both developer options and hidden fields are not empty, so we need to save the developer options to the hidden fields and remove the code from screen and add the new code
              await saveToHiddenFields({
                ...developerOptionsCode,
                guid: currentGuid,
              });
              Fliplet.Studio.emit("reload-page-preview"); // reloading the page preview
              return;
            }
          }
        } catch (error) {
          console.error("Error in handleComponentGuid:", error);
        }
      }

      Fliplet.Hooks.on("componentEvent", async function (event) {
        if (
          event?.type == "removed" &&
          widgetId == event?.removed[0]?.widgetId
        ) {
          var currentSettings = await getCurrentPageSettings();

          var cleanedHtml = removeHtmlCode(currentSettings);

          const layoutResponse = await saveLayoutToDeveloperOptions(cleanedHtml);

          const cleanedCss = removeCodeWithinDelimiters(
            "css",
            currentSettings.page.settings.customSCSS
          );
          const cleanedJs = removeCodeWithinDelimiters(
            "js",
            currentSettings.page.settings.customJS
          );
          await saveCssAndJsToDeveloperOptions(cleanedCss, cleanedJs);

          // reload page preview
          Fliplet.Studio.emit("reload-page-preview");

          return { removedHtml, layoutResponse };
        }
      });

      async function getCurrentPageSettings() {
        return await Fliplet.API.request({
          url: `v1/apps/${appId}/pages/${pageId}?richLayout`,
          method: "GET",
        }).catch((error) => {
          return Fliplet.UI.Toast("Error getting current settings: " + error);
        });
      }

      async function saveCssAndJsToDeveloperOptions(css, js) {
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

      async function saveLayoutToDeveloperOptions(html) {
        return await Fliplet.API.request({
          url: `v1/apps/${appId}/pages/${pageId}/rich-layout`,
          method: "PUT",
          data: { richLayout: html },
        });
      }

      async function saveCodeWithWrapperToDeveloperOptions(parsedContent) {
        try {
          // get current page settings
          const currentSettings = await getCurrentPageSettings();

          // Save CSS and JavaScript
          const settingsResponse = await saveCssAndJsToDeveloperOptions(
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

          const htmlCodeToInject = injectHtmlCode(
            currentSettings,
            parsedContent
          );

          const layoutResponse = await saveLayoutToDeveloperOptions(htmlCodeToInject);

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

      function injectHtmlCode(currentSettings, parsedContent) {
        // code from AI
        var codeGenContainer = `<div class="ai-feature-${getGuidFromComponent()}">${
          parsedContent.layoutHTML
        }</div>`;
        // Wrap response inside a temporary container
        let $wrapper = $("<div>").html(currentSettings.page.richLayout);
        // remove existing ai feature container
        $wrapper.find(`.ai-feature-${getGuidFromComponent}`).remove();
        // Find `<fl-ai-feature>` and add a sibling after it
        $wrapper
          .find(`fl-ai-feature[cid="${widgetId}"]`)
          .after(codeGenContainer);
        return $wrapper.html();
      }

      function getCodeFromDeveloperOptionsWithoutComments(type, code) {
        // removeCodeWithinDelimiters
        const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (type === "js") {
          let start = `// start-ai-feature ${getGuidFromComponent()}`;
          let end = `// end-ai-feature ${getGuidFromComponent()}`;
          let pattern = new RegExp(esc(start) + "([\\s\\S]*?)" + esc(end), "g");
          let match = pattern.exec(code);
          let codeWithComments = match ? match[1] : "";
          return codeWithComments;
        } else if (type === "css") {
          let start = `/* start-ai-feature ${getGuidFromComponent()} */`;
          let end = `/* end-ai-feature ${getGuidFromComponent()} */`;
          let pattern = new RegExp(esc(start) + "([\\s\\S]*?)" + esc(end), "g");
          let match = pattern.exec(code);
          let codeWithComments = match ? match[1] : "";
          return codeWithComments;
        }
      }

      function getHtmlFromDeveloperOptions(html) {
        let $wrapper = $("<div>").html(html);
        let codeWithoutClass = $wrapper
          .find(`.ai-feature-${getGuidFromComponent()}`)
          .html();
        return codeWithoutClass;
      }

      function removeHtmlCode(currentSettings) {
        let $wrapper = $("<div>").html(currentSettings.page.richLayout);
        // remove existing ai feature container
        $wrapper.find(`.ai-feature-${getGuidFromComponent()}`).remove();
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
          start = `// start-ai-feature ${getGuidFromComponent()}`;
          end = `// end-ai-feature ${getGuidFromComponent()}`;

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
          start = `/* start-ai-feature ${getGuidFromComponent()} */`;
          end = `/* end-ai-feature ${getGuidFromComponent()} */`;

          if (oldCode.includes(start) && oldCode.includes(end)) {
            // Replace content between delimiters
            // For CSS, we need to escape the special characters properly
            patternStart = `/\\* start-ai-feature ${getGuidFromComponent()} \\*/`;
            patternEnd = `/\\* end-ai-feature ${getGuidFromComponent()} \\*/`;

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
        const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        let start, end;

        if (type === "js") {
          start = `// start-ai-feature ${getGuidFromComponent()}`;
          end = `// end-ai-feature ${getGuidFromComponent()}`;
        } else {
          // Keep CSS markers RAW, not pre-escaped; we'll escape them when building the RegExp
          start = `/* start-ai-feature ${getGuidFromComponent()} */`;
          end = `/* end-ai-feature ${getGuidFromComponent()} */`;
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

      async function handleNewComponent() {
        AI.fields.guid = generateGuid();
        await Fliplet.Widget.save(AI.fields, { id: widgetId });
        Fliplet.Studio.emit("reload-page-preview");
      }

      async function handleRegenerateCode() {
        let parsedContent = {
          css: AI.fields.css,
          javascript: AI.fields.javascript,
          layoutHTML: AI.fields.layoutHTML,
        };
        await saveCodeWithWrapperToDeveloperOptions(parsedContent);
        AI.fields.regenerateCode = false;
        await Fliplet.Widget.save(AI.fields, { id: widgetId });
        Fliplet.Studio.emit("reload-page-preview");
      }

      if (!getGuidFromComponent()) { // new component
        await handleNewComponent();
      } else if (AI.fields.regenerateCode) { // code generated by AI
        await handleRegenerateCode();
      } else { // existing component
        await handleComponentGuid();
      }
    },
  },
});
