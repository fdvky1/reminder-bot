import Canvas from "canvas";

const wrapText = (ctx, text, maxWidth) => {
    if(ctx.measureText(text).width < maxWidth) return [text];
    if(ctx.measureText("W").width > maxWidth) return null;
    const words = text.split(" ");
    const lines = [];
    let line = "";
    while(words.length > 0) {
        let split = false;
        while(ctx.measureText(words[0]).width >= maxWidth){
            const tmp = words[0];
            words[0] = tmp.slice(0, -1);
            if(split){
                words[1] = `${tmp.slice(-1)}${words[1]}`
            }else{
                split = true;
                words.splice(1, 0, tmp.slice(-1));
            }
        }
        if (ctx.measureText(`${line}${words[0]}`).width < maxWidth) {
            line += `${words.shift()} `;
        } else {
            lines.push(line.trim());
            line = "";
        }
        if (words.length === 0) lines.push(line.trim());
    }
    return lines;
}


const generateMeme = async (imageSrc, topText, bottomText) => {
    const base = await Canvas.loadImage(imageSrc);
    const canvas = Canvas.createCanvas(base.width, base.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(base, 0, 0);
    const fontSize = Math.round(base.height / 10);
    ctx.font = `${fontSize}px Impact`;
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    const topLines = await wrapText(ctx, topText, base.width - 10)
    if (topLines) {
        for (let i = 0; i < topLines.length; i++) {
          const textHeight = i * fontSize + i * 10;
          ctx.strokeStyle = "black";
          ctx.lineWidth = 5;
          ctx.strokeText(topLines[i], base.width / 2, textHeight);
          ctx.fillStyle = "white";
          ctx.fillText(topLines[i], base.width / 2, textHeight);
        }
      }
      const bottomLines = await wrapText(ctx, bottomText, base.width - 10);
      if (bottomLines) {
        ctx.textBaseline = "bottom";
        const initial =
          base.height -
          (bottomLines.length - 1) * fontSize -
          (bottomLines.length - 1) * 10;
        for (let i = 0; i < bottomLines.length; i++) {
          const textHeight = initial + i * fontSize + i * 10;
          ctx.strokeStyle = "black";
          ctx.lineWidth = 5;
          ctx.strokeText(bottomLines[i], base.width / 2, textHeight);
          ctx.fillStyle = "white";
          ctx.fillText(bottomLines[i], base.width / 2, textHeight);
        }
      }
      
      return canvas.toBuffer();
}

export default generateMeme;