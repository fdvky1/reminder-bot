import fs from "fs";
import { registerFont } from "canvas";

const loadFont = () => {
  console.log("font load start");
  const fontsDir = "assets/fonts/";

  fs.readdir(fontsDir, (_err, files) => {
    files.forEach((file) => {
      try {
        registerFont(`${fontsDir}${file}`, {
          family: file.replace(/\.[^/.]+$/, ""),
        });
      } catch (error) {
        console.error(`${fontsDir}${file} not font file`);
      }
    });
  });

  console.log("font load end");
}

export default loadFont;