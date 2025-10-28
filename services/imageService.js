// services/imageService.js
import * as FileSystem from "expo-file-system/legacy";

const GOOGLE_APPS_SCRIPT_URL = "Script_de_Google_Apps_aquí";

export const imageService = {
  /**
   * Subir múltiples imágenes
   */
  uploadImages: async (imageUris, projectId) => {
    const uploadedUrls = [];

    for (const uri of imageUris) {
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, { 
          encoding: "base64" 
        });

        const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64,
            name: `nota-${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`,
            mimeType: "image/jpeg",
            projectId: projectId,
          }),
        });

        const text = await res.text();
        let data = null;
        
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          console.error("Respuesta no-JSON del servidor:", text);
          continue;
        }

        if (data && data.url) {
          uploadedUrls.push(data.url);
          console.log("✅ Imagen subida exitosamente:", data.url);
        } else {
          console.warn("La subida no devolvió URL válida:", data);
        }
      } catch (imgError) {
        console.error("❌ Error subiendo imagen:", imgError);
      }
    }

    return uploadedUrls;
  }
};

export default imageService;