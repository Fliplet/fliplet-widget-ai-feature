/**
 * Setup image paste handling functionality
 * @param {Object} DOM - DOM elements object
 * @param {Object} AppState - Application state object
 */
function setupImagePasteHandling(DOM, AppState) {
  // Add paste event listener to the input field only
  // This prevents duplicate processing when pasting into the input
  DOM.userInput.addEventListener("paste", function(event) {
    handleImagePaste(event, DOM, AppState);
  });
}

function setupImageDragAndDropHandling(DOM, AppState) {
  // Add drag and drop event listeners to the input field and uploaded-images area
  const dropZones = [DOM.userInput, DOM.uploadedImages];

  dropZones.forEach((zone) => {
    if (!zone) return;

    // Prevent default drag behaviors
    zone.addEventListener("dragover", handleDragOver);
    zone.addEventListener("dragenter", handleDragEnter);
    zone.addEventListener("dragleave", handleDragLeave);
    zone.addEventListener("drop", function(e) {
      handleImageDrop(e, DOM, AppState);
    });

    // Add visual feedback for drag operations
    zone.addEventListener("dragenter", function (e) {
      e.preventDefault();
      zone.classList.add("drag-over");
    });

    zone.addEventListener("dragleave", function (e) {
      e.preventDefault();
      // Only remove class if we're leaving the zone entirely
      if (!zone.contains(e.relatedTarget)) {
        zone.classList.remove("drag-over");
      }
    });

    zone.addEventListener("drop", function (e) {
      e.preventDefault();
      zone.classList.remove("drag-over");
    });
  });

  // Add drag and drop to the chat section EXCLUDING the input field to prevent duplicate processing
  const chatSection = document.querySelector(".chat-section");
  if (chatSection) {
    chatSection.addEventListener("dragover", handleDragOver);
    chatSection.addEventListener("dragenter", function (e) {
      e.preventDefault();
      // Don't add drag-over class if we're over the input field
      if (e.target !== DOM.userInput && !DOM.userInput.contains(e.target)) {
        chatSection.classList.add("drag-over");
      }
    });
    chatSection.addEventListener("dragleave", function (e) {
      e.preventDefault();
      if (!chatSection.contains(e.relatedTarget)) {
        chatSection.classList.remove("drag-over");
      }
    });
    chatSection.addEventListener("drop", function (e) {
      e.preventDefault();
      chatSection.classList.remove("drag-over");

      // Only process drop if we're NOT dropping on the input field
      // This prevents duplicate processing when dropping on input
      if (e.target !== DOM.userInput && !DOM.userInput.contains(e.target)) {
        handleImageDrop(e, DOM, AppState);
      }
    });
  }

  // Prevent default drag behaviors on the entire document to avoid browser default handling
  document.addEventListener("dragover", function (e) {
    e.preventDefault();
  });

  document.addEventListener("drop", function (e) {
    e.preventDefault();
  });
}

/**
 * Handle drag over events for drag and drop
 * @param {DragEvent} event - The drag over event
 */
function handleDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
}

/**
 * Handle drag enter events for drag and drop
 * @param {DragEvent} event - The drag enter event
 */
function handleDragEnter(event) {
  event.preventDefault();
}

/**
 * Handle drag leave events for drag and drop
 * @param {DragEvent} event - The drag leave event
 */
function handleDragLeave(event) {
  event.preventDefault();
}

/**
 * Handle image drop events for drag and drop
 * @param {DragEvent} event - The drop event
 */
function handleImageDrop(event, DOM, AppState) {
  event.preventDefault();

  // Generate a unique event ID to prevent duplicate processing
  const eventId = `${event.timeStamp}-${
    event.target.id || "unknown"
  }-${Date.now()}`;

  // Check if we've already processed this event to prevent duplicates
  if (AppState.processedFileSignatures.has(`event-${eventId}`)) {
    console.log("⚠️ Event already processed, skipping duplicate:", eventId);
    return;
  }

  // Mark this event as processed
  AppState.processedFileSignatures.add(`event-${eventId}`);

  // Log the drop target to help debug duplicate processing
  console.log("📥 Image drop event triggered:", {
    eventId: eventId,
    target: event.target,
    targetId: event.target.id,
    targetClass: event.target.className,
    isInputField: event.target === DOM.userInput,
    isInputChild: DOM.userInput && DOM.userInput.contains(event.target),
    eventType: "drop",
    timestamp: new Date().toISOString(),
    timeStamp: event.timeStamp,
  });

  const files = Array.from(event.dataTransfer.files);
  const validImageFiles = files.filter((file) => isValidImageFile(file));
  const invalidImageFiles = files.filter(
    (file) => file.type.startsWith("image/") && !isValidImageFile(file)
  );
  const nonImageFiles = files.filter((file) => !file.type.startsWith("image/"));

  if (validImageFiles.length > 0) {
    console.log(
      "📥 Dropped valid image files:",
      validImageFiles.map((f) => ({ name: f.name, type: f.type, size: f.size }))
    );

    // Show a brief success message
    showDropSuccessMessage(validImageFiles.length);

    // Process each dropped image file
    validImageFiles.forEach((file) => {
      processPastedImage(file, DOM, AppState); // Reuse existing paste processing logic
    });
  }

  if (invalidImageFiles.length > 0) {
    console.log(
      "⚠️ Dropped invalid image files:",
      invalidImageFiles.map((f) => ({
        name: f.name,
        type: f.type,
        size: f.size,
      }))
    );

    // Provide more specific error messages
    const errorDetails = invalidImageFiles.map((file) => {
      if (file.size > 5 * 1024 * 1024) {
        return `${file.name} (too large)`;
      } else if (!file.name || file.name.trim() === "") {
        return `${file.name || "unnamed"} (invalid name)`;
      } else {
        return `${file.name} (unsupported format)`;
      }
    });

    showDropErrorMessage(`Invalid images: ${errorDetails.join(", ")}`);
  }

  if (nonImageFiles.length > 0) {
    console.log(
      "⚠️ Dropped non-image files ignored:",
      nonImageFiles.map((f) => f.type)
    );
    showDropErrorMessage(
      `Ignored ${nonImageFiles.length} non-image file${
        nonImageFiles.length > 1 ? "s" : ""
      }`
    );

    // Show help message for first-time users
    if (nonImageFiles.length > 0) {
      showImageFormatHelp();
    }
  }

  // Clear any drag over states
  clearDragOverStates();
}

/**
 * Validate if a file is a valid image
 * @param {File} file - The file to validate
 * @returns {boolean} - True if valid image, false otherwise
 */
function isValidImageFile(file) {
  // Check if it's an image file
  if (!file.type.startsWith("image/")) {
    return false;
  }

  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return false;
  }

  // Check if file has a valid name
  if (!file.name || file.name.trim() === "") {
    return false;
  }

  // Check for common image formats
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
  ];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return false;
  }

  return true;
}

/**
 * Clear all drag over visual states
 */
function clearDragOverStates() {
  const elements = document.querySelectorAll(".drag-over");
  elements.forEach((element) => {
    element.classList.remove("drag-over");
  });
}

/**
 * Show a success message when images are dropped
 * @param {number} count - Number of images dropped
 */
function showDropSuccessMessage(count) {
  const message = document.createElement("div");
  message.className = "drop-success-message";
  message.textContent = `✅ ${count} image${
    count > 1 ? "s" : ""
  } dropped successfully!`;

  // Add to the chat section temporarily
  const chatSection = document.querySelector(".chat-section");
  if (chatSection) {
    chatSection.appendChild(message);

    // Remove after 3 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.parentNode.removeChild(message);
      }
    }, 3000);
  }
}

/**
 * Show an error message when non-image files are dropped
 * @param {string} message - Error message to display
 */
function showDropErrorMessage(message) {
  const errorMessage = document.createElement("div");
  errorMessage.className = "drop-error-message";
  errorMessage.textContent = `❌ ${message}`;

  // Add to the chat section temporarily
  const chatSection = document.querySelector(".chat-section");
  if (chatSection) {
    chatSection.appendChild(errorMessage);

    // Remove after 3 seconds
    setTimeout(() => {
      if (errorMessage.parentNode) {
        errorMessage.parentNode.removeChild(errorMessage);
      }
    }, 3000);
  }
}

/**
 * Show a help message about supported image formats
 */
function showImageFormatHelp() {
  const helpMessage = document.createElement("div");
  helpMessage.className = "drop-help-message";
  helpMessage.innerHTML = `
      <div style="text-align: center; padding: 10px;">
        <strong>📁 Supported Image Formats:</strong><br>
        JPEG, PNG, GIF, WebP, BMP<br>
        <small>Maximum file size: 5MB</small>
      </div>
    `;

  // Add to the chat section temporarily
  const chatSection = document.querySelector(".chat-section");
  if (chatSection) {
    chatSection.appendChild(helpMessage);

    // Remove after 5 seconds
    setTimeout(() => {
      if (helpMessage.parentNode) {
        helpMessage.parentNode.removeChild(helpMessage);
      }
    }, 5000);
  }
}

/**
 * Handle image paste events
 * @param {ClipboardEvent} event - The paste event
 * @param {Object} DOM - DOM elements object
 * @param {Object} AppState - Application state object
 */
function handleImagePaste(event, DOM, AppState) {
  const items = (event.clipboardData || event.originalEvent?.clipboardData)
    ?.items;

  if (!items) return;

  let hasImages = false;
  let processedFiles = new Set(); // Track processed files to prevent duplicates

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.type.indexOf("image") !== -1) {
      hasImages = true;
      const file = item.getAsFile();
      if (
        file &&
        !processedFiles.has(file.name + file.size + file.lastModified)
      ) {
        processedFiles.add(file.name + file.size + file.lastModified);
        processPastedImage(file, DOM, AppState);
      }
    }
  }

  if (hasImages) {
    event.preventDefault();
  }
}

/**
 * Process a pasted image file
 *
 * Uses Fliplet.Media.Files.upload() to upload images to Fliplet Media
 * and then sends them to OpenAI in the proper image_url format.
 *
 * @param {File} file - The image file to process
 */
async function processPastedImage(file, DOM, AppState) {
  // Validate file type
  if (!file.type.startsWith("image/")) {
    console.log("⚠️ Non-image file ignored:", file.type);
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    console.log("⚠️ Image too large, max 5MB allowed");
    showDropErrorMessage("Image too large, max 5MB allowed");
    return;
  }

  // Check if this file is already being processed to prevent duplicates
  // Use a more reliable signature that includes the file's lastModified time
  const fileSignature = `${file.name}-${file.size}-${file.lastModified}`;

  if (AppState.processedFileSignatures.has(fileSignature)) {
    console.log("⚠️ File already processed, skipping duplicate:", {
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      signature: fileSignature,
    });

    // Check if the image is actually still in the pastedImages array
    const stillExists = AppState.pastedImages.some(
      (img) => img.name === file.name && img.size === file.size
    );

    if (!stillExists) {
      console.log(
        "ℹ️ Image was removed, allowing re-addition by removing old signature"
      );
      AppState.processedFileSignatures.delete(fileSignature);
    } else {
      return; // Image still exists, don't allow duplicate
    }
  }

  // Add to processed signatures set
  AppState.processedFileSignatures.add(fileSignature);

  // Log the signature for debugging
  console.log("📝 Added file signature to prevent duplicates:", {
    signature: fileSignature,
    totalSignatures: AppState.processedFileSignatures.size,
  });

  // Make the reset function available globally for debugging
  if (typeof window !== "undefined") {
    window.resetFileSignatures = resetFileSignatures;
    window.cleanupOrphanedFileSignatures = cleanupOrphanedFileSignatures;
    console.log(
      "🔧 Debug functions available: window.resetFileSignatures(), window.cleanupOrphanedFileSignatures()"
    );
  }

  // Clean up old signatures periodically to prevent memory bloat
  // This will be handled by the clearPastedImages function and periodic cleanup

  // Create image data object first
  const imageData = {
    id: Date.now() + Math.random(),
    name: file.name || "pasted-image",
    type: file.type,
    size: file.size,
    dataUrl: null, // Will be set after upload
    flipletUrl: null, // Will store the Fliplet Media URL
    flipletFileId: null, // Will store the Fliplet Media file ID for deletion
    timestamp: new Date().toISOString(),
    status: "uploading",
  };

  try {
    // Add to state immediately
    AppState.pastedImages.push(imageData);
    console.log("📥 Image added to AppState.pastedImages:", {
      id: imageData.id,
      name: imageData.name,
      status: imageData.status,
      appStateInstanceId: AppState.instanceId,
    });
    console.log(
      "📥 Total images in state after adding:",
      AppState.pastedImages.length
    );
    console.log(
      "📥 All IDs in state:",
      AppState.pastedImages.map((img) => img.id)
    );

    // Display in UI with upload status
    displayPastedImage(imageData, DOM);

    // Upload to Fliplet Media using the proper API
    // FormData structure follows Fliplet Media API requirements:
    // - files[0]: The actual file object
    // - name[0]: The filename for the uploaded file
    const formData = new FormData();
    formData.append("files[0]", file);
    formData.append("name[0]", file.name || "pasted-image");

    // Get the current app ID for context
    const appId = Fliplet.Env.get("appId") || Fliplet.Env.get("masterAppId");
    if (appId) {
      formData.append("appId", appId);
    }

    try {
      // Use Fliplet.Media.Files.upload() as specified in the documentation
      // You can specify a folderId to organize images in specific folders
      // Example: folderId: 123 for a specific media folder
      console.log("📤 Starting Fliplet Media upload for file:", {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      const uploadResult = await Fliplet.Media.Files.upload({
        data: formData,
        folderId: null, // Optional: specify folderId if you want to organize images
      });

      console.log("📤 Fliplet Media upload result:", uploadResult);

      if (uploadResult && uploadResult.length) {
        const uploadedFile = uploadResult[0];
        console.log("📤 Uploaded file details:", uploadedFile);

        // Update image data with Fliplet Media URL and file ID
        imageData.flipletUrl = Fliplet.Media.authenticate(uploadedFile.url);
        imageData.flipletFileId = uploadedFile.id; // Store the file ID for deletion
        imageData.status = "uploaded";

        console.log("✅ Image data updated after upload:", {
          id: imageData.id,
          flipletUrl: imageData.flipletUrl,
          flipletFileId: imageData.flipletFileId,
          status: imageData.status,
        });

        // Create a data URL for local display
        const reader = new FileReader();
        reader.onload = function (e) {
          imageData.dataUrl = e.target.result;
          updateImageDisplay(imageData);
        };
        reader.readAsDataURL(file);

        console.log("✅ Image uploaded to Fliplet Media successfully:", {
          name: imageData.name,
          flipletUrl: imageData.flipletUrl,
          flipletFileId: imageData.flipletFileId,
        });
      } else {
        throw new Error("No files returned from Fliplet Media upload");
      }
    } catch (uploadError) {
      console.error("❌ Failed to upload to Fliplet Media:", uploadError);
      throw uploadError; // Re-throw to be caught by outer catch block
    }
  } catch (error) {
    console.error("❌ Failed to upload image to Fliplet Media:", error);

    // Update status to failed
    const failedImage = AppState.pastedImages.find(
      (img) => img.id === imageData.id
    );
    if (failedImage) {
      failedImage.status = "failed";
      updateImageDisplay(failedImage);
    }

    // Show error to user
    Fliplet.UI.Toast.error(
      "Failed to upload image to Fliplet Media. Please try again."
    );
  }
}

/**
 * Display a pasted image in the uploaded-images section
 * @param {Object} imageData - The image data object
 */
function displayPastedImage(imageData, DOM) {
  if (!DOM.uploadedImages) return;

  // Hide placeholder if it exists
  const placeholder = DOM.uploadedImages.querySelector(
    ".no-images-placeholder"
  );
  if (placeholder) {
    placeholder.style.display = "none";
  }

  const imageContainer = document.createElement("div");
  imageContainer.className = "pasted-image-container";
  imageContainer.dataset.imageId = imageData.id;

  // Create initial display based on status
  updateImageDisplay(imageData, imageContainer);

  DOM.uploadedImages.appendChild(imageContainer);

  // Show the uploaded-images section if it was hidden
  DOM.uploadedImages.style.display = "block";
}

/**
 * Update the display of an image based on its current status
 * @param {Object} imageData - The image data object
 * @param {HTMLElement} container - Optional container element to update
 */
function updateImageDisplay(imageData, container = null) {
  if (!container) {
    container = document.querySelector(`[data-image-id="${imageData.id}"]`);
    if (!container) return;
  }

//   let statusHtml = "";
  let imageHtml = "";

  switch (imageData.status) {
    case "uploading":
    //   statusHtml = '<div class="upload-status uploading">📤 Uploading...</div>';
      imageHtml = '<div class="image-placeholder">⏳</div>';
      break;
    case "uploaded":
    //   statusHtml = '<div class="upload-status uploaded">✅ Uploaded</div>';
      if (imageData.dataUrl) {
        imageHtml = `<img src="${imageData.dataUrl}" alt="${imageData.name}" class="pasted-image" />`;
      } else {
        imageHtml = '<div class="image-placeholder">🖼️</div>';
      }
      break;
    case "failed":
    //   statusHtml = '<div class="upload-status failed">❌ Upload Failed</div>';
      imageHtml = '<div class="image-placeholder">⚠️</div>';
      break;
    default:
    //   statusHtml = '<div class="upload-status">⏳ Processing...</div>';
      imageHtml = '<div class="image-placeholder">⏳</div>';
  }

  // Clear existing content first
  container.innerHTML = "";

  // Create elements properly to avoid onclick issues
  const imageElement = document.createElement("div");
  imageElement.innerHTML = imageHtml;

  const removeButton = document.createElement("button");
  removeButton.className = "remove-image-btn";
  removeButton.setAttribute("title", "Remove image");
  removeButton.innerHTML = "×";
  removeButton.dataset.imageId = imageData.id; // Store the ID in data attribute

  const imageInfo = document.createElement("div");
  imageInfo.className = "image-info";
  imageInfo.innerHTML = `
      <span class="image-name">${imageData.name}</span>
      <span class="image-size">${formatFileSize(imageData.size)}</span>
    `;

//   const statusElement = document.createElement("div");
//   statusElement.innerHTML = statusHtml;

  // Append all elements
  container.appendChild(imageElement.firstElementChild || imageElement);
  container.appendChild(removeButton);
  container.appendChild(imageInfo);
//   container.appendChild(statusElement.firstElementChild || statusElement);
}

/**
 * Remove a pasted image from local state and chat history
 * Note: Images are kept in Fliplet Media for future reference
 * IMPORTANT: This function should be called BEFORE sending messages to ensure
 * the AI doesn't receive stale image data
 * @param {string} imageId - The ID of the image to remove
 */
async function removePastedImage(imageId, DOM, AppState) {
  console.log(
    "🔍 Starting image removal process for ID:",
    imageId,
    "(keeping in Fliplet Media)"
  );
  console.log("🔍 Current AppState.pastedImages:", AppState.pastedImages);
  console.log("🔍 AppState.pastedImages length:", AppState.pastedImages.length);
  console.log(
    "🔍 All image IDs in state:",
    AppState.pastedImages.map((img) => img.id)
  );
  console.log("🔍 AppState instance ID:", AppState.instanceId);

  // Find the image data first
  let imageData = AppState.pastedImages.find((img) => img.id == imageId);

  if (!imageData) {
    console.error("❌ Image data not found for ID:", imageId);
    console.error(
      "❌ Available IDs:",
      AppState.pastedImages.map((img) => img.id)
    );
    console.error("❌ Searching for:", imageId);
    console.error("❌ Type of search ID:", typeof imageId);
    console.error(
      "❌ Type of stored IDs:",
      AppState.pastedImages.map((img) => typeof img.id)
    );

    // Try to find by string comparison
    const stringMatch = AppState.pastedImages.find(
      (img) => String(img.id) === String(imageId)
    );
    if (stringMatch) {
      console.log("🔍 Found match using string comparison:", stringMatch);
      // Use this match instead
      imageData = stringMatch;
    } else {
      return;
    }
  }

  console.log("🔍 Found image data:", {
    id: imageData.id,
    name: imageData.name,
    status: imageData.status,
    flipletFileId: imageData.flipletFileId,
    flipletUrl: imageData.flipletUrl,
  });

  // Note: We're keeping the image in Fliplet Media for future reference
  // Only removing it from local state and chat history
  if (imageData.flipletFileId) {
    console.log(
      "ℹ️ Keeping image in Fliplet Media (ID:",
      imageData.flipletFileId,
      ") - only removing from local state and chat history"
    );
  }

  // Remove from local state
  const initialCount = AppState.pastedImages.length;
  const beforeFilter = AppState.pastedImages.map((img) => ({
    id: img.id,
    name: img.name,
  }));

  AppState.pastedImages = AppState.pastedImages.filter(
    (img) => img.id != imageId
  );
  const finalCount = AppState.pastedImages.length;
  const afterFilter = AppState.pastedImages.map((img) => ({
    id: img.id,
    name: img.name,
  }));

  // Remove the file signature from processedFileSignatures so the same file can be added again
  if (imageData.name && imageData.size) {
    // Try multiple signature formats to ensure we find and remove the correct one
    const possibleSignatures = [
      `${imageData.name}-${imageData.size}-${imageData.lastModified || 0}`,
      `${imageData.name}-${imageData.size}`,
      `${imageData.name}-${imageData.size}-${new Date(
        imageData.timestamp
      ).getTime()}`,
    ];

    let signatureRemoved = false;
    possibleSignatures.forEach((signature) => {
      if (AppState.processedFileSignatures.has(signature)) {
        AppState.processedFileSignatures.delete(signature);
        console.log(
          "🗑️ File signature removed from processedFileSignatures:",
          signature
        );
        signatureRemoved = true;
      }
    });

    if (!signatureRemoved) {
      console.log("ℹ️ No matching file signature found to remove for:", {
        name: imageData.name,
        size: imageData.size,
        lastModified: imageData.lastModified,
        timestamp: imageData.timestamp,
      });
    }
  }

  console.log("🗑️ Local state updated (image kept in Fliplet Media):", {
    removedId: imageId,
    initialCount: initialCount,
    finalCount: finalCount,
    removed: initialCount - finalCount,
    beforeFilter: beforeFilter,
    afterFilter: afterFilter,
  });

  // Remove from UI
  const imageContainer = document.querySelector(`[data-image-id="${imageId}"]`);
  if (imageContainer) {
    imageContainer.remove();
    console.log(
      "🗑️ Image container removed from DOM (image kept in Fliplet Media)"
    );
  } else {
    console.warn("⚠️ Image container not found in DOM for ID:", imageId);
  }

  // Hide uploaded-images section if no images left
  if (AppState.pastedImages.length === 0 && DOM.uploadedImages) {
    DOM.uploadedImages.innerHTML =
      '<div class="no-images-placeholder">No images attached</div>';
    DOM.uploadedImages.style.display = "none";
    console.log(
      "🗑️ Uploaded images section hidden (no local images remaining - Fliplet Media images preserved)"
    );
  }

  // Clean up chat history messages that reference this removed image
  console.log("🧹 About to clean up chat history for image ID:", imageId);
  cleanupChatHistoryImages(imageId, DOM);

  // Clean up orphaned file signatures to prevent "File already processed" issues
  cleanupOrphanedFileSignatures(AppState);

  console.log(
    "✅ Image removal process completed for ID:",
    imageId,
    "- image kept in Fliplet Media"
  );
}

/**
 * Clean up chat history messages that reference removed images
 * @param {string} imageId - The ID of the removed image
 * @param {Object} DOM - DOM elements object
 * @param {Object} AppState - Application state object
 */
function cleanupChatHistoryImages(imageId, DOM, AppState) {
  console.log("🧹 Cleaning up chat history for removed image ID:", imageId);
  console.log("🧹 Current chat history length:", AppState.chatHistory.length);

  let messagesUpdated = 0;
  let totalImagesRemoved = 0;

  // Update chat history to remove references to the deleted image
  AppState.chatHistory = AppState.chatHistory.map((historyItem) => {
    if (historyItem.images && Array.isArray(historyItem.images)) {
      console.log("🧹 Checking message for images:", {
        messageId: historyItem.timestamp,
        imageCount: historyItem.images.length,
        imageIds: historyItem.images.map((img) => ({
          id: img.id,
          type: typeof img.id,
        })),
      });

      // Filter out the removed image (use string comparison for robustness)
      const filteredImages = historyItem.images.filter((img) => {
        const match = String(img.id) !== String(imageId);
        if (!match) {
          console.log("🧹 Found matching image to remove:", {
            storedId: img.id,
            type: typeof img.id,
            searchId: imageId,
            searchType: typeof imageId,
            stringComparison: String(img.id) === String(imageId),
          });
        }
        return match;
      });

      if (filteredImages.length !== historyItem.images.length) {
        const removedCount = historyItem.images.length - filteredImages.length;
        messagesUpdated++;
        totalImagesRemoved += removedCount;

        console.log("🧹 Removed image reference from chat history message:", {
          messageId: historyItem.timestamp,
          originalImageCount: historyItem.images.length,
          newImageCount: filteredImages.length,
          removedImageId: imageId,
          removedCount: removedCount,
        });

        // Return updated history item with filtered images
        return {
          ...historyItem,
          images: filteredImages,
        };
      }
    }
    return historyItem;
  });

  console.log("🧹 Cleanup summary:", {
    messagesUpdated: messagesUpdated,
    totalImagesRemoved: totalImagesRemoved,
  });

  if (totalImagesRemoved > 0) {
    // Save updated chat history to storage
    saveChatHistoryToStorage();

    // Update the chat interface to reflect the changes
    updateChatInterface(DOM, AppState);
  }

  console.log("🧹 Chat history cleanup completed for image ID:", imageId);

  // Verify cleanup was successful
  verifyChatHistoryCleanup(imageId, DOM, AppState);
}

/**
 * Verify that chat history cleanup was successful
 * @param {string} imageId - The ID of the image that should have been removed
 * @param {Object} DOM - DOM elements object
 * @param {Object} AppState - Application state object
 */
function verifyChatHistoryCleanup(imageId, DOM, AppState) {
  console.log("🔍 Verifying chat history cleanup for image ID:", imageId);

  let referencesFound = 0;
  let totalMessagesChecked = 0;

  AppState.chatHistory.forEach((historyItem, index) => {
    if (historyItem.images && Array.isArray(historyItem.images)) {
      totalMessagesChecked++;
      const hasReference = historyItem.images.some(
        (img) => String(img.id) === String(imageId)
      );
      if (hasReference) {
        referencesFound++;
        console.error(
          "❌ [VERIFICATION] Image reference still found in chat history:",
          {
            messageIndex: index,
            messageId: historyItem.timestamp,
            messageType: historyItem.type,
            imageIds: historyItem.images.map((img) => img.id),
          }
        );
      }
    }
  });

  if (referencesFound === 0) {
    console.log(
      "✅ [VERIFICATION] Chat history cleanup verified - no remaining references to image ID:",
      imageId
    );
  } else {
    console.error(
      "❌ [VERIFICATION] Chat history cleanup failed - found",
      referencesFound,
      "remaining references to image ID:",
      imageId
    );
  }

  console.log("🔍 Verification summary:", {
    totalMessagesChecked: totalMessagesChecked,
    referencesFound: referencesFound,
    imageId: imageId,
  });
}

/**
 * Clean up orphaned file signatures that don't correspond to existing images
 * This prevents the "File already processed" issue when images are removed
 */
function cleanupOrphanedFileSignatures(AppState) {
  console.log("🧹 Cleaning up orphaned file signatures...");

  const initialSignatureCount = AppState.processedFileSignatures.size;
  const signaturesToRemove = [];

  // Check each signature to see if it corresponds to an existing image
  AppState.processedFileSignatures.forEach((signature) => {
    // Skip event signatures (they start with 'event-')
    if (signature.startsWith("event-")) {
      return;
    }

    // Extract file info from signature (format: name-size-lastModified)
    const parts = signature.split("-");
    if (parts.length >= 2) {
      const fileName = parts[0];
      const fileSize = parseInt(parts[1]);

      // Check if an image with this name and size still exists
      const imageExists = AppState.pastedImages.some(
        (img) => img.name === fileName && img.size === fileSize
      );

      if (!imageExists) {
        signaturesToRemove.push(signature);
      }
    }
  });

  // Remove orphaned signatures
  signaturesToRemove.forEach((signature) => {
    AppState.processedFileSignatures.delete(signature);
    console.log("🗑️ Removed orphaned file signature:", signature);
  });

  const finalSignatureCount = AppState.processedFileSignatures.size;
  console.log("🧹 Orphaned signature cleanup complete:", {
    initialCount: initialSignatureCount,
    removedCount: signaturesToRemove.length,
    finalCount: finalSignatureCount,
  });
}

/**
 * Manually reset file signatures (useful for debugging or when issues occur)
 * This will allow all files to be processed again
 */
function resetFileSignatures(AppState) {
  console.log("🔄 Manually resetting file signatures...");
  const initialCount = AppState.processedFileSignatures.size;
  AppState.processedFileSignatures.clear();
  console.log("🔄 File signatures reset:", {
    initialCount: initialCount,
    finalCount: AppState.processedFileSignatures.size,
  });
}

/**
 * Update chat interface to reflect current chat history state
 * @param {Object} DOM - DOM elements object
 * @param {Object} AppState - Application state object
 */
function updateChatInterface(DOM, AppState) {
  console.log("🔄 Updating chat interface with current history:", {
    historyLength: AppState.chatHistory.length,
    messagesWithImages: AppState.chatHistory.filter(
      (item) => item.images && item.images.length > 0
    ).length,
  });

  // Clear current chat interface
  DOM.chatMessages.innerHTML = "";

  // Repopulate with updated chat history (without adding to history again)
  AppState.chatHistory.forEach((item) => {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${item.type}-message`;

    const prefix =
      item.type === "user" ? "You" : item.type === "ai" ? "AI" : "System";

    // Build message content
    let messageContent = `<strong>${prefix}:</strong> ${escapeHTML(
      item.message
    )}`;

    // Add images if present
    if (item.images && item.images.length > 0) {
      const imagesHTML = item.images
        .map((img) => {
          // Use flipletUrl for permanent image storage
          const imageSrc = img.flipletUrl;
          if (!imageSrc) {
            console.warn("⚠️ Image missing flipletUrl:", img);
            return "";
          }

          return `<div class="chat-image-container">
            <img src="${imageSrc}" alt="${img.name}" class="chat-image" />
            <div class="chat-image-info">${img.name} (${formatFileSize(
            img.size
          )})</div>
           </div>`;
        })
        .join("");

      if (imagesHTML) {
        messageContent += `<div class="chat-images">${imagesHTML}</div>`;
      }
    }

    messageDiv.innerHTML = messageContent;
    DOM.chatMessages.appendChild(messageDiv);
  });

  // Ensure resize handle is present
  ensureResizeHandlePresent();

  // Scroll to bottom
  scrollToBottom();

  console.log("🔄 Chat interface update completed");
}

/**
 * Handle image removal from onclick handlers
 * This function handles the async operation and provides user feedback
 * @param {string} imageId - The ID of the image to remove
 */
async function handleImageRemove(imageId, DOM, AppState) {
  try {
    // Show loading state on the button
    const button = document.querySelector(
      `[data-image-id="${imageId}"] .remove-image-btn`
    );
    if (button) {
      const originalText = button.innerHTML;
      button.innerHTML = "⏳";
      button.disabled = true;

      // Remove the image
      await removePastedImage(imageId, DOM, AppState);

      // Button will be removed with the container, so no need to restore
    }
  } catch (error) {
    console.error("❌ Error removing image:", error);
    Fliplet.UI.Toast.error("Failed to remove image. Please try again.");

    // Restore button state if there was an error
    const button = document.querySelector(
      `[data-image-id="${imageId}"] .remove-image-btn`
    );
    if (button) {
      button.innerHTML = "×";
      button.disabled = false;
    }
  }
}

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Clear all pasted images from local state and chat history
 * Note: Images are kept in Fliplet Media for future reference
 */
function clearPastedImages(skipChatHistoryCleanup = false, DOM, AppState) {
  // Note: We're keeping all images in Fliplet Media for future reference
  // Only clearing them from local state and chat history
  console.log(
    "ℹ️ Keeping all images in Fliplet Media - only clearing from local state"
  );

  const imageCount = AppState.pastedImages.filter(
    (img) => img.flipletFileId
  ).length;
  if (imageCount > 0) {
    console.log(
      `ℹ️ ${imageCount} images will remain in Fliplet Media (not deleted from service)`
    );
  }

  // Store image IDs before clearing for potential chat history cleanup
  const imageIdsToCleanup = skipChatHistoryCleanup
    ? []
    : AppState.pastedImages.map((img) => img.id);

  // Clear local state
  AppState.pastedImages = [];

  // Clear processed file signatures to allow re-adding the same images
  AppState.processedFileSignatures.clear();
  console.log(
    "🧹 Processed file signatures cleared - same images can now be added again"
  );

  if (DOM.uploadedImages) {
    DOM.uploadedImages.innerHTML =
      '<div class="no-images-placeholder">No images attached</div>';
    DOM.uploadedImages.style.display = "none";
    console.log(
      "🗑️ Uploaded images section hidden (local state cleared, Fliplet Media images preserved)"
    );
  }

  // Only clean up chat history if this is NOT an automatic clearing after AI processing
  if (!skipChatHistoryCleanup && imageIdsToCleanup.length > 0) {
    console.log("🧹 Cleaning up chat history for automatically cleared images");
    imageIdsToCleanup.forEach((imageId) => {
      cleanupChatHistoryImages(imageId, DOM, AppState);
    });
  } else {
    console.log(
      "ℹ️ Skipping chat history cleanup - preserving visual context for AI responses"
    );
  }

  console.log(
    "🧹 All pasted images cleared from local state (kept in Fliplet Media)"
  );
}
