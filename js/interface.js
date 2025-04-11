var selectedDataSourceId = null;
var selectedDataSourceName = null;
var widgetId = Fliplet.Widget.getDefaultId();
var dataSourceColumns = [];
var chatHistory = []; // Array to store chat history

Fliplet.Widget.setSaveButtonLabel("Close");
Fliplet.Widget.toggleCancelButton(false);

Fliplet.Widget.generateInterface({
  fields: [
    {
      type: "html",
      html: `Use this component to generate features within a screen using AI. The code created will be available in the developer tools.
            <br>
            <br>
            Select a data source if you want your feature to use a data source.
            <br><br>`,
    },
    {
      type: "provider",
      name: "dataSourceId",
      package: "com.fliplet.data-source-provider",
      data: function (value) {
        return {
          dataSourceTitle: "Data source",
          dataSourceId: value,
          appId: Fliplet.Env.get("appId"),
          default: {
            name: "Data source",
            entries: [],
            columns: [],
          },
          accessRules: [
            {
              allow: "all",
              type: ["select"],
            },
          ],
        };
      },
      onEvent: function (eventName, data) {
        // Listen for events fired from the provider
        if (eventName === "dataSourceSelect") {
          selectedDataSourceId = data.id;
          selectedDataSourceName = data.name;

          if (selectedDataSourceId) {
            Fliplet.DataSources.getById(selectedDataSourceId, {
              attributes: ["columns"],
            }).then(function (response) {
              dataSourceColumns = response.columns;
            });
          } else {
            dataSourceColumns = [];
          }
        }
      },
      beforeSave: function (value) {
        return value && value.id;
      },
    },
    {
      type: "html",
      html: `
        <div class="panel-group" id="accordion-1">
          <div class="panel panel-default focus-outline" data-collapse-id="3543664" data-collapse-uuid="497033ba-6a63-4bdc-9180-80a7937f27e6" tabindex="0">
            <h4 class="panel-title collapsed" data-target="#collapse-3543664" data-toggle="collapse" data-parent="#accordion-1">
              What features are available?
            </h4>
            <div class="panel-collapse collapse" id="collapse-3543664">
              <div class="panel-body"> 
                The following features are available via your prompt:
                <br>
                1. Read, insert, update, delete, join data source names (ensure you configure the security rules)
                <br>
                2. Load screen names or URLs
                <br>
                3. User data based on the columns in the user data source
                <br>
                4. Charts using eCharts library (Add echarts via Dev Tools > Libraries)
                <br>
                5. Tables using DataTables (Add datatables via Dev Tools > Libraries)
                <br>
                6. The ability to send Emails
                <br>
                Note: Only the information in your prompt is shared with AI. AI cannot access your data or app.
              </div>
            </div>
          </div>
        </div>
      `
    },
    {
      name: "prompt",
      type: "textarea",
      label: "Prompt",
      default: "",
      rows: 12,
    },
    {
      type: "html",
      html: `<br>
            Clicking generate will ask AI to create the feature based on your prompt.
            <br><br>`,
    },
    {
      type: "html",
      html: '<input type="button" class="btn btn-primary generate-code" value="Generate code" />',
      ready: function () {
        $(this.$el).find(".generate-code").on("click", generateCode);
        toggleLoader(false);
      },
    },
    {
      type: "html",
      html: `<button disabled class="btn btn-primary generate-code-disabled">
                <div class="spinner-holder">
                  <div class="spinner-overlay"></div>
                </div>
                <div>Generating...</div>
            </button>`,
      ready: function () {
        toggleLoader(false);
      },
    },
    {
      type: "hidden",
      name: "css",
      label: "CSS",
      default: "",
      rows: 12,
    },
    {
      type: "hidden",
      name: "javascript",
      label: "JavaScript",
      default: "",
    },
    {
      type: "hidden",
      name: "layoutHTML",
      label: "Layout",
      default: "",
    },
    {
      type: "hidden",
      name: "aiClientResponse",
      label: "AI Client Response",
      default: "",
    },
    {
      type: "hidden",
      name: "regenerateCode",
      label: "Regenerate code",
      description: "Regenerate code",
      toggleLabel: "Regenerate",
      default: false,
    },
    {
      type: "html",
      html: `<div class="deep-chat"></div>`,
      ready: function () {
        // Create a simple chat interface
        const container = this.$el.querySelector('.deep-chat');

        // Add basic chat UI
        container.innerHTML = `
          <div class="chat-container" style="height: 400px; width: 100%; border: 1px solid #ddd; border-radius: 4px; display: flex; flex-direction: column;">
            <div class="chat-messages" style="flex: 1; overflow-y: auto; padding: 10px;"></div>
            <div class="chat-input" style="padding: 10px; border-top: 1px solid #ddd; display: flex;">
              <input type="text" class="message-input" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-right: 10px;" placeholder="Type your message...">
              <button class="send-button" style="padding: 8px 16px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Send</button>
            </div>
          </div>
        `;

        const messagesContainer = container.querySelector('.chat-messages');
        const inputField = container.querySelector('.message-input');
        const sendButton = container.querySelector('.send-button');

        // Add initial message
        addMessage('Hello! How can I help you today?', 'ai');

        // Handle send button click
        sendButton.addEventListener('click', function(e) {
          e.preventDefault();
          handleSend();
        });
        inputField.addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSend();
          }
        });

        async function handleSend() {
          const message = inputField.value.trim();
          if (!message) return;

          // Add user message to chat and history
          addMessage(message, 'user');
          chatHistory.push({ role: 'user', content: message });
          inputField.value = '';

          try {
            // Show loader while processing
            toggleLoader(true);
            
            // Process the message and get AI response
            const parsedContent = await queryAI(message);
            console.log('AI response received:', parsedContent);
            
            // Add AI response to chat and history
            if (parsedContent.aiClientResponse) {
              addMessage(parsedContent.aiClientResponse, 'ai');
              chatHistory.push({ role: 'ai', content: parsedContent.aiClientResponse });
            } else if (parsedContent.html || parsedContent.css || parsedContent.javascript) {
              let responseContent = 'I have generated the code for your request. Here\'s what I created:';
              
              if (parsedContent.html && parsedContent.html.trim()) {
                responseContent += '\n\nHTML:\n' + parsedContent.html;
              }
              
              if (parsedContent.css && parsedContent.css.trim()) {
                responseContent += '\n\nCSS:\n' + parsedContent.css;
              }
              
              if (parsedContent.javascript && parsedContent.javascript.trim()) {
                responseContent += '\n\nJavaScript:\n' + parsedContent.javascript;
              }
              
              responseContent += '\n\nPlease review the code and let me know if you need any changes or have any questions.';
              
              addMessage(responseContent, 'ai');
              chatHistory.push({ role: 'ai', content: responseContent });
            }
          } catch (error) {
            console.error('Error processing message:', error);
            addMessage('Sorry, there was an error processing your request.', 'ai');
            chatHistory.push({ role: 'ai', content: 'Sorry, there was an error processing your request.' });
          } finally {
            // Hide loader when done
            toggleLoader(false);
          }
        }

        function addMessage(text, role) {
          const messageDiv = document.createElement('div');
          messageDiv.style.marginBottom = '10px';
          messageDiv.style.padding = '8px 12px';
          messageDiv.style.borderRadius = '4px';
          messageDiv.style.maxWidth = '80%';
          messageDiv.style.alignSelf = role === 'user' ? 'flex-end' : 'flex-start';
          messageDiv.style.backgroundColor = role === 'user' ? '#007bff' : '#f8f9fa';
          messageDiv.style.color = role === 'user' ? 'white' : '#212529';
          messageDiv.style.marginLeft = role === 'user' ? 'auto' : '0';
          messageDiv.style.marginRight = role === 'user' ? '0' : 'auto';
          
          messageDiv.textContent = text;
          messagesContainer.appendChild(messageDiv);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;

          // Add message to chat history
          chatHistory.push({
            role: role,
            content: text,
            timestamp: new Date().toISOString()
          });
        }
      },
    },
  ],
});

function toggleLoader(isDisabled) {
  if (isDisabled) {
    $(".interface").find(".generate-code-disabled").show();
    $(".interface").find(".generate-code").hide();
  } else {
    $(".interface").find(".generate-code-disabled").hide();
    $(".interface").find(".generate-code").show();
  }
}

function generateCode() {
  toggleLoader(true);
  var prompt = Fliplet.Helper.field("prompt").get();
  if (prompt) {
    return queryAI(prompt)
      .then(function (parsedContent) {
        // Save the generated code
        return saveGeneratedCode(parsedContent);
      })
      .catch(function (error) {
        toggleLoader(false);
        return Promise.reject(error);
      });
  } else {
    Fliplet.Studio.emit("reload-widget-instance", widgetId);
  }
}

function queryAI(prompt) {
  let systemPrompt = `
You are to only return the HTML, CSS, JS for the following user request. In the JS make sure that any selectors are using .ai-feature-${widgetId}

If any information in the user's request is unclear or missing, you should ask clarifying questions and return them in the aiClientResponse field. For example:
- If the user wants to create a form but doesn't specify the fields
- If the user wants to display data but doesn't specify which columns
- If the user wants to create a chart but doesn't specify the type
- If the user wants to send an email but doesn't specify recipients

The format of the response should be as follows: 

### HTML
<div>
  <h1>Hello World</h1>
</div>
### CSS
div {
  color: red;
}
### JavaScript
document.addEventListener('DOMContentLoaded', function() {
  const div = document.querySelector('.ai-feature-${widgetId} div');
  div.style.color = 'blue';
});
### aiClientResponse
I need some clarification about your request. Could you please specify:
1. What type of chart would you like to create?
2. Which data columns should be used for the chart?

For the HTML do not include any head tags, just return the html for the body. 
Use bootstrap v3.4.1 for css and styling.
Do not include any backticks in the response.
Ensure there are no syntax errors in the code and that column names with spaced in them are wrapped with square brackets.
Add inline comments for the code so technical users can make edits to the code. 
Add try catch blocks in the code to catch any errors and log the errors to the console. 
Ensure you chain all the promises correctly with return statements.
You must only return code in the format specified. Do not return any text.

Previous conversation history:
${chatHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

If the user has provided a selected data source then use that in your data source requests. If not do not assume any data source name. 

User provided data source name: ${selectedDataSourceName}

These are the list of columns in the data source selected by the user: ${dataSourceColumns}, you must one of these when referencing data from a data source. 
`;

  return Fliplet.AI.createCompletion({
    model: "o3-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    reasoning_effort: "low",
  }).then(function (result) {
    // Parse the response
    const response = result.choices[0].message.content;

    // Initialize variables
    let html = "";
    let css = "";
    let javascript = "";
    let aiClientResponse = "";

    // Extract HTML
    const htmlMatch = response.match(/### HTML\n([\s\S]*?)(?=### CSS|$)/);
    if (htmlMatch) {
      html = htmlMatch[1].trim();
    }

    // Extract CSS
    const cssMatch = response.match(/### CSS\n([\s\S]*?)(?=### JavaScript|$)/);
    if (cssMatch) {
      css = cssMatch[1].trim();
    }

    // Extract JavaScript
    const jsMatch = response.match(/### JavaScript\n([\s\S]*?)(?=### aiClientResponse|$)/);
    if (jsMatch) {
      javascript = jsMatch[1].trim();
    }

    // Extract AI Client Response
    const aiClientResponseMatch = response.match(/### aiClientResponse\n([\s\S]*?)(?=$)/);
    if (aiClientResponseMatch) {
      aiClientResponse = aiClientResponseMatch[1].trim();
    }

    return {
      html,
      css,
      javascript,
      aiClientResponse
    };
  });
}

function saveGeneratedCode(parsedContent) {
  Fliplet.Helper.field("layoutHTML").set(parsedContent.html);
  Fliplet.Helper.field("css").set(parsedContent.css);
  Fliplet.Helper.field("javascript").set(parsedContent.javascript);
  Fliplet.Helper.field("regenerateCode").set(true);

  var data = Fliplet.Widget.getData();
  data.fields.dataSourceId = selectedDataSourceId;
  data.fields.dataSourceName = selectedDataSourceName;
  data.fields.prompt = Fliplet.Helper.field("prompt").get();
  data.fields.layoutHTML = parsedContent.html;
  data.fields.css = parsedContent.css;
  data.fields.javascript = parsedContent.javascript;
  data.fields.regenerateCode = true;
  data.fields.aiClientResponse = parsedContent.aiClientResponse;

  return Fliplet.Widget.save(data.fields).then(function () {
    // Check if any code was generated
    if (parsedContent.html || parsedContent.css || parsedContent.javascript) {
      let messageContent = 'I have generated the code for your request. Here\'s what I created:';
      
      if (parsedContent.html && parsedContent.html.trim()) {
        messageContent += '\n\nHTML:\n' + parsedContent.html;
      }
      
      if (parsedContent.css && parsedContent.css.trim()) {
        messageContent += '\n\nCSS:\n' + parsedContent.css;
      }
      
      if (parsedContent.javascript && parsedContent.javascript.trim()) {
        messageContent += '\n\nJavaScript:\n' + parsedContent.javascript;
      }
      
      messageContent += '\n\nPlease review the code and let me know if you need any changes or have any questions.';
      
      // Add the AI response with the generated code
      addMessage(messageContent, 'ai');
      
      toggleLoader(false);
      return;
    }

    // If no code was generated, show the clarifying questions
    if (parsedContent.aiClientResponse) {
      // Add the AI response with clarifying questions
      addMessage(parsedContent.aiClientResponse, 'ai');
      
      // Also show a toast notification
      Fliplet.UI.Toast(parsedContent.aiClientResponse);
    }
    
    toggleLoader(false);
  });
}
