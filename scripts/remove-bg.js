const { Jimp } = require('jimp');

async function processImage() {
  try {
    const image = await Jimp.read('../public/logo.jpg');
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    const tolerance = 40; // High tolerance for JPEG compression artifacts around black
    const isBlackish = (idx) => {
      const r = image.bitmap.data[idx];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];
      return r < tolerance && g < tolerance && b < tolerance;
    };
    
    const visited = new Uint8Array(width * height);
    const queue = [
      {x: 0, y: 0}, 
      {x: width-1, y: 0}, 
      {x: 0, y: height-1}, 
      {x: width-1, y: height-1}
    ];
    
    while(queue.length > 0) {
      const {x, y} = queue.pop();
      if(x < 0 || x >= width || y < 0 || y >= height) continue;
      
      const pos = y * width + x;
      if(visited[pos]) continue;
      visited[pos] = 1;
      
      const idx = pos * 4;
      if(isBlackish(idx)) {
        // Set alpha to 0
        image.bitmap.data[idx + 3] = 0;
        
        queue.push({x: x+1, y});
        queue.push({x: x-1, y});
        queue.push({x, y: y+1});
        queue.push({x, y: y-1});
      }
    }

    // Optional: a tiny feathering for edges 
    // Smooth the alpha channel slightly
    // We will just do a simple pass over pixels adjacent to transparent ones and set them to 50% alpha if they are somewhat dark
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        if (image.bitmap.data[idx + 3] !== 0) {
          // Check neighbors
          let hasTransparentNeighbor = false;
          const neighbors = [
            ((y-1)*width + x)*4,
            ((y+1)*width + x)*4,
            (y*width + (x-1))*4,
            (y*width + (x+1))*4
          ];
          for(let n of neighbors) {
            if (image.bitmap.data[n + 3] === 0) hasTransparentNeighbor = true;
          }
          if (hasTransparentNeighbor) {
            const r = image.bitmap.data[idx];
            if (r < 80) { // If it's a dark edge pixel, bleed it to smooth aliasing
              image.bitmap.data[idx + 3] = 100; // Semi transparent
            }
          }
        }
      }
    }

    await image.write('../public/logo_transparent.png');
    console.log('Success');
  } catch(e) {
    console.error(e);
  }
}

processImage();
