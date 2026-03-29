const drawCanvas=document.getElementById('drawCanvas');
const gridCanvas=document.getElementById('gridCanvas');
let ctx=drawCanvas.getContext('2d');
const gridCtx=gridCanvas.getContext('2d');

let drawing=false; let tool='pencil'; let brushSize=10; let pencilSize=4; let eraserSize=20; let eraserOpacity=1; let eraserType='hard'; let eraserShape='circle'; let eraserPressure=false; let color='black'; let zoom=1;

// Layer System
let layers = [];
let activeLayerId = 1;
let nextLayerId = 2;
function createLayer(name = 'Layer') {
  const layerCanvas = document.createElement('canvas');
  layerCanvas.width = drawCanvas.width;
  layerCanvas.height = drawCanvas.height;
  return {
    id: activeLayerId,
    name: name,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'source-over',
    canvas: layerCanvas,
    ctx: layerCanvas.getContext('2d'),
    type: 'raster'
  };
}
layers.push(createLayer('Background'));
activeLayerId = layers[0].id;
let gridEnabled=true; let gridGap=100; let gridOpacity=0.5; let gridColor='rgba(128,128,128,0.5)'; let gridType='square'; let gridLineWidth=1; let gridSnapEnabled=false;
let guidelines=[]; let guidelineSnapEnabled=false; let guidelineColor='rgba(79,172,254,0.8)'; let guidelineOpacity=0.8; let nextGuidelineId=0;
let shapeType='rect'; let fillShape=false; let textValue=''; let fontSize=20; let selectMode='lasso'; let feathering=0; let scaleX=1; let scaleY=1; let rotateAngle=0; let skewX=0; let skewY=0; let snapToGrid=false;
let shapeMode='outline'; let strokeWidth=2; let strokeColor='#000000'; let fillColor='#ffffff'; let cornerRadius=0; let polygonSides=5; let shapeSnapToGrid=false;
let startPos = null;
let selectionActive = false;
let selectionData = null;
let selectionBounds = null;
let draggingSelection = false;
let dragOffset = {x: 0, y: 0};
let fontFamily = 'Arial';
let textColor = '#000000';
let textBold = false;
let textItalic = false;
let textAlign = 'left';
let textInputElement = null;
let recentColors = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
let eyedropperMode = false;
let gradientStops = [{pos: 0, color: '#000000'}, {pos: 1, color: '#ffffff'}];
let gradientType = 'linear';
let blendMode = 'source-over';
let opacity = 1;
let patternType = 'none';
let hue = 0;
let sat = 0;
let val = 1;

let pencilPresets=[
  {name:'Default Pencil',size:4,hardness:70,opacity:1,color:'#000000',style:'standard'},
  {name:'Graphite',size:5,hardness:40,opacity:0.8,color:'#2f2f2f',style:'graphite'},
  {name:'Charcoal',size:8,hardness:20,opacity:0.6,color:'#1f1f1f',style:'charcoal'},
  {name:'Ink',size:2,hardness:90,opacity:1,color:'#000000',style:'ink'}
];
let customPencilPresets=[];
let selectedPencilPreset='Default Pencil';
let pencilHardness=70; let pencilOpacity=1; let pencilPressure=false;

let brushPresets=[
  {name:'Basic Round',size:8,hardness:90,opacity:1,flow:0.8,color:'#000000',style:'round'},
  {name:'Watercolor',size:16,hardness:40,opacity:0.55,flow:0.4,color:'#0055ff',style:'watercolor'},
  {name:'Charcoal',size:18,hardness:25,opacity:0.7,flow:0.65,color:'#333333',style:'charcoal'},
  {name:'Ink',size:5,hardness:95,opacity:1,flow:1,color:'#000000',style:'ink'},
  {name:'Spray',size:20,hardness:15,opacity:0.6,flow:0.5,color:'#999999',style:'spray'}
];
let customBrushPresets=[];
let selectedBrushPreset='Basic Round';
let brushOpacity=1; let brushFlow=0.8; let brushHardness=90; let brushPressure=false; let brushBlend='normal'; let brushTexture='none';

// Undo/Redo History
let history=[];
let historyStep=-1;

function saveHistory(){
  // Remove any redo steps when a new action is taken
  history=history.slice(0,historyStep+1);
  // Save current canvas state
  history.push(drawCanvas.toDataURL());
  historyStep++;
  // Limit history to 20 steps
  if(history.length>20){
    history.shift();
    historyStep--;
  }
}

function undo(){
  if(historyStep>0){
    historyStep--;
    const img=new Image();
    img.onload=()=>{canvasCtx.clearRect(0,0,drawCanvas.width,drawCanvas.height);canvasCtx.drawImage(img,0,0);};
    img.src=history[historyStep];
  }
}

function redo(){
  if(historyStep<history.length-1){
    historyStep++;
    const img=new Image();
    img.onload=()=>{canvasCtx.clearRect(0,0,drawCanvas.width,drawCanvas.height);canvasCtx.drawImage(img,0,0);};
    img.src=history[historyStep];
  }
}

// Layer Management Functions
function getActiveLayer() {
  return layers.find(l => l.id === activeLayerId);
}

function addLayer(name = 'Layer') {
  const newLayer = createLayer(name);
  newLayer.id = nextLayerId++;
  layers.push(newLayer);
  setActiveLayer(newLayer.id);
  updateLayersList();
  return newLayer;
}

function deleteLayer(layerId) {
  if (layers.length === 1) {
    alert('Cannot delete the last layer');
    return;
  }
  layers = layers.filter(l => l.id !== layerId);
  if (activeLayerId === layerId) {
    setActiveLayer(layers[0].id);
  }
  updateLayersList();
  renderLayers();
}

function setActiveLayer(layerId) {
  activeLayerId = layerId;
  updateLayersList();
  renderLayers();
}

function duplicateLayer(layerId) {
  const layer = layers.find(l => l.id === layerId);
  if (!layer) return;
  const newLayer = createLayer(layer.name + ' copy');
  newLayer.id = nextLayerId++;
  newLayer.opacity = layer.opacity;
  newLayer.blendMode = layer.blendMode;
  newLayer.ctx.drawImage(layer.canvas, 0, 0);
  layers.push(newLayer);
  setActiveLayer(newLayer.id);
  updateLayersList();
  renderLayers();
}

function renameLayer(layerId, newName) {
  const layer = layers.find(l => l.id === layerId);
  if (layer) {
    layer.name = newName;
    updateLayersList();
  }
}

function toggleLayerVisibility(layerId) {
  const layer = layers.find(l => l.id === layerId);
  if (layer) {
    layer.visible = !layer.visible;
    updateLayersList();
    renderLayers();
  }
}

function toggleLayerLock(layerId) {
  const layer = layers.find(l => l.id === layerId);
  if (layer) {
    layer.locked = !layer.locked;
    updateLayersList();
  }
}

function setLayerOpacity(layerId, opacityValue) {
  const layer = layers.find(l => l.id === layerId);
  if (layer) {
    layer.opacity = opacityValue / 100;
    renderLayers();
  }
}

function setLayerBlendMode(layerId, mode) {
  const layer = layers.find(l => l.id === layerId);
  if (layer) {
    layer.blendMode = mode;
    renderLayers();
  }
}

function reorderLayers(fromIndex, toIndex) {
  const layer = layers.splice(fromIndex, 1)[0];
  layers.splice(toIndex, 0, layer);
  updateLayersList();
  renderLayers();
}

function updateLayersList() {
  const layerList = document.getElementById('layerList');
  if (!layerList) return;
  layerList.innerHTML = '';
  
  layers.slice().reverse().forEach((layer, reverseIdx) => {
    const idx = layers.length - 1 - reverseIdx;
    const div = document.createElement('div');
    div.className = 'layer-item' + (layer.id === activeLayerId ? ' active' : '');
    div.draggable = true;
    
    // Create thumbnail canvas
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 40;
    thumbCanvas.height = 40;
    const thumbCtx = thumbCanvas.getContext('2d');
    thumbCtx.fillStyle = '#000';
    thumbCtx.fillRect(0, 0, 40, 40);
    // Scale down layer content to thumbnail
    const scale = Math.min(40 / layer.canvas.width, 40 / layer.canvas.height, 1);
    thumbCtx.drawImage(layer.canvas, 0, 0, layer.canvas.width * scale, layer.canvas.height * scale);
    
    const thumbnailDiv = document.createElement('div');
    thumbnailDiv.className = 'layer-thumbnail';
    thumbnailDiv.appendChild(thumbCanvas);
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'layer-info';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'layer-name';
    nameSpan.textContent = layer.name;
    nameSpan.style.cursor = 'pointer';
    nameSpan.ondblclick = () => editLayerName(nameSpan, layer.id);
    
    const opacitySpan = document.createElement('span');
    opacitySpan.className = 'layer-opacity-display';
    opacitySpan.textContent = `Opacity: ${Math.round(layer.opacity * 100)}%`;
    
    infoDiv.appendChild(nameSpan);
    infoDiv.appendChild(opacitySpan);
    
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'layer-controls';
    
    const visibilityBtn = document.createElement('button');
    visibilityBtn.className = 'layer-visibility';
    visibilityBtn.title = 'Toggle visibility';
    visibilityBtn.onclick = (e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); };
    visibilityBtn.innerHTML = `<i class="fa-solid fa-${layer.visible ? 'eye' : 'eye-slash'}"></i>`;
    
    const lockBtn = document.createElement('button');
    lockBtn.className = 'layer-lock';
    lockBtn.title = 'Toggle lock';
    lockBtn.onclick = (e) => { e.stopPropagation(); toggleLayerLock(layer.id); };
    lockBtn.innerHTML = `<i class="fa-solid fa-${layer.locked ? 'lock' : 'lock-open'}"></i>`;
    
    const menuBtn = document.createElement('button');
    menuBtn.className = 'layer-menu';
    menuBtn.textContent = '⋮';
    menuBtn.onclick = (e) => { e.stopPropagation(); showLayerMenu(layer.id, e); };
    
    controlsDiv.appendChild(visibilityBtn);
    controlsDiv.appendChild(lockBtn);
    controlsDiv.appendChild(menuBtn);
    
    div.onclick = () => setActiveLayer(layer.id);
    div.appendChild(thumbnailDiv);
    div.appendChild(infoDiv);
    div.appendChild(controlsDiv);
    
    // Drag and drop for reordering
    div.ondragstart = (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('layerId', layer.id);
    };
    div.ondragover = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      div.style.opacity = '0.7';
    };
    div.ondragleave = () => {
      div.style.opacity = '1';
    };
    div.ondrop = (e) => {
      e.preventDefault();
      div.style.opacity = '1';
      const draggedId = e.dataTransfer.getData('layerId');
      const fromIdx = layers.findIndex(l => l.id == draggedId);
      const toIdx = idx;
      if (fromIdx !== toIdx) {
        reorderLayers(fromIdx, toIdx);
      }
    };
    
    layerList.appendChild(div);
  });
  
  // Update blend mode dropdown
  const blendSelect = document.getElementById('layerBlendMode');
  const opacityInput = document.getElementById('layerOpacityInput');
  const opacityValue = document.getElementById('opacityValue');
  const layer = getActiveLayer();
  if (layer) {
    if (blendSelect) blendSelect.value = layer.blendMode;
    if (opacityInput) {
      opacityInput.value = Math.round(layer.opacity * 100);
      if (opacityValue) opacityValue.textContent = Math.round(layer.opacity * 100);
    }
  }
}

function editLayerName(element, layerId) {
  const layer = layers.find(l => l.id === layerId);
  if (!layer) return;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = layer.name;
  input.className = 'layer-name-input';
  element.replaceWith(input);
  input.focus();
  input.select();
  input.onblur = () => {
    renameLayer(layerId, input.value);
    updateLayersList();
  };
  input.onkeydown = e => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') updateLayersList();
  };
}

function showLayerMenu(layerId, event) {
  const menu = document.createElement('div');
  menu.className = 'layer-context-menu';
  menu.innerHTML = `
    <button onclick="duplicateLayer(${layerId}); closeLayerMenu()">Duplicate</button>
    <button onclick="deleteLayer(${layerId}); closeLayerMenu()">Delete</button>
  `;
  document.body.appendChild(menu);
  menu.style.position = 'fixed';
  menu.style.top = event.pageY + 'px';
  menu.style.left = event.pageX + 'px';
  window.closeLayerMenu = () => menu.remove();
  menu.addEventListener('blur', () => menu.remove(), true);
  setTimeout(() => menu.remove(), 3000);
}

function renderLayers() {
  canvasCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  layers.forEach(layer => {
    if (layer.visible) {
      const prevBlend = canvasCtx.globalCompositeOperation;
      const prevAlpha = canvasCtx.globalAlpha;
      canvasCtx.globalCompositeOperation = layer.blendMode;
      canvasCtx.globalAlpha = layer.opacity;
      canvasCtx.drawImage(layer.canvas, 0, 0);
      canvasCtx.globalCompositeOperation = prevBlend;
      canvasCtx.globalAlpha = prevAlpha;
    }
  });
}

function resize(){
  const rect=document.querySelector('.canvas-holder').getBoundingClientRect();
  [drawCanvas,gridCanvas].forEach(c=>{c.width=rect.width; c.height=rect.height;});
  layers.forEach(layer => {
    layer.canvas.width = drawCanvas.width;
    layer.canvas.height = drawCanvas.height;
  });
  drawBackgroundGrid();
  renderLayers();
}

function drawBackgroundGrid(){
  const w=gridCanvas.width,h=gridCanvas.height; 
  gridCtx.clearRect(0,0,w,h);
  if(!gridEnabled) return;
  
  gridCtx.strokeStyle=gridColor; 
  gridCtx.globalAlpha=gridOpacity;
  gridCtx.lineWidth=gridLineWidth;
  const gap=gridGap;
  
  if(gridType === 'square'){
    // Standard square grid
    for(let x=0;x<w;x+=gap){gridCtx.beginPath();gridCtx.moveTo(x,0);gridCtx.lineTo(x,h);gridCtx.stroke();}
    for(let y=0;y<h;y+=gap){gridCtx.beginPath();gridCtx.moveTo(0,y);gridCtx.lineTo(w,y);gridCtx.stroke();}
  } else if(gridType === 'dot'){
    // Dot grid
    gridCtx.fillStyle=gridColor;
    for(let x=0;x<w;x+=gap){
      for(let y=0;y<h;y+=gap){
        gridCtx.beginPath();
        gridCtx.arc(x,y,gridLineWidth,0,2*Math.PI);
        gridCtx.fill();
      }
    }
  } else if(gridType === 'isometric'){
    // Isometric grid
    const angle60 = Math.PI/3; // 60 degrees
    for(let i=0;i<w+h;i+=gap){
      // Diagonal lines 1
      gridCtx.beginPath();
      gridCtx.moveTo(i,0);
      gridCtx.lineTo(i-h,h);
      gridCtx.stroke();
      // Diagonal lines 2
      gridCtx.beginPath();
      gridCtx.moveTo(0,i);
      gridCtx.lineTo(w,i-w);
      gridCtx.stroke();
    }
    // Vertical lines for isometric
    for(let x=0;x<w;x+=gap){
      gridCtx.beginPath();
      gridCtx.moveTo(x,0);
      gridCtx.lineTo(x,h);
      gridCtx.stroke();
    }
  }
  
  // Draw guidelines on top of grid
  drawGuidelines();
  
  gridCtx.globalAlpha=1;
}

function drawGuidelines(){
  if(guidelines.length === 0) return;
  
  const w = gridCanvas.width;
  const h = gridCanvas.height;
  
  gridCtx.lineWidth = 1;
  gridCtx.setLineDash([5, 5]);
  
  guidelines.forEach(guide => {
    gridCtx.strokeStyle = guide.color || guidelineColor;
    gridCtx.globalAlpha = (guide.opacity !== undefined) ? guide.opacity : guidelineOpacity;
    gridCtx.beginPath();
    if(guide.type === 'horizontal'){
      gridCtx.moveTo(0, guide.position);
      gridCtx.lineTo(w, guide.position);
    } else if(guide.type === 'vertical'){
      gridCtx.moveTo(guide.position, 0);
      gridCtx.lineTo(guide.position, h);
    } else if(guide.type === 'diagonal'){
      const angle = guide.angle || 45;
      const slope = Math.tan(angle * Math.PI / 180);
      gridCtx.moveTo(0, guide.position);
      gridCtx.lineTo(w, guide.position + w * slope);
    }
    gridCtx.stroke();
  });
  
  gridCtx.globalAlpha = 1;
  gridCtx.setLineDash([]);
}

function drawSelectionOutline(){
  if(selectionActive && selectionBounds){
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(selectionBounds.x, selectionBounds.y, selectionBounds.width, selectionBounds.height);
    ctx.setLineDash([]);
  }
}

function rgbToHex(rgb){
  if(rgb.startsWith('#')) return rgb;
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if(match){
    return '#' + ((1 << 24) + (+match[1] << 16) + (+match[2] << 8) + +match[3]).toString(16).slice(1);
  }
  return '#000000';
}

function hexToRgb(hex){
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgb(${r},${g},${b})`;
}

function hsvToRgb(h, s, v) {
  h = h / 360;
  s = s / 100;
  v = v / 100;
  let r, g, b;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
}

function drawColorWheel(canvas) {
  const ctx = canvas.getContext('2d');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 10;

  for (let angle = 0; angle < 360; angle++) {
    for (let sat = 0; sat <= 100; sat += 1) {
      const rad = (angle * Math.PI) / 180;
      const x = centerX + (sat / 100) * radius * Math.cos(rad);
      const y = centerY + (sat / 100) * radius * Math.sin(rad);
      ctx.fillStyle = hsvToRgb(angle, sat, val * 100);
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // Draw value indicator
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.stroke();
}

function getPos(e){const rect=drawCanvas.getBoundingClientRect(); return {x:(e.clientX-rect.left)/zoom,y:(e.clientY-rect.top)/zoom}};

// Layer-aware drawing setup
let canvasCtx = ctx; // Main canvas context
function switchToLayerContext() {
  const layer = getActiveLayer();
  if (layer && !layer.locked) {
    ctx = layer.ctx;
  }
}
function switchToCanvasContext() {
  ctx = canvasCtx;
  renderLayers();
}

drawCanvas.addEventListener('mousedown',e=>{
  drawing=true;
  switchToLayerContext();
  const p=getPos(e);
  if(tool==='pencil' || tool==='brush' || tool==='eraser'){
    ctx.beginPath();
    ctx.moveTo(p.x,p.y);
    if(tool==='eraser'){
      ctx.lineWidth = eraserSize;
      ctx.globalCompositeOperation='destination-out';
      ctx.strokeStyle='rgba(0,0,0,1)';
      ctx.globalAlpha = eraserType==='soft' ? Math.max(0.2, eraserOpacity*0.6) : eraserOpacity;
      if(eraserType==='shape'){
        // For shape eraser, draw as filled shape in mousemove
        ctx.lineJoin='round';
        ctx.lineCap='round';
      } else {
        ctx.lineCap='round';
        ctx.lineJoin='round';
      }
    } else {
      ctx.lineWidth = tool==='brush' ? brushSize : pencilSize;
      ctx.globalCompositeOperation='source-over';
      ctx.strokeStyle=color;
      ctx.globalAlpha = tool==='brush' ? brushOpacity : pencilOpacity;
      if(tool==='brush'){
        ctx.lineCap='round';
        ctx.lineJoin='round';
      } else {
        ctx.lineCap='round';
        ctx.lineJoin='round';
      }
    }
  } else if(tool === 'shapes'){
    startPos = p;
  } else if(tool === 'select'){
    startPos = p;
    if(selectionActive && selectionBounds){
      // Check if click is inside selection
      if(p.x >= selectionBounds.x && p.x <= selectionBounds.x + selectionBounds.width &&
         p.y >= selectionBounds.y && p.y <= selectionBounds.y + selectionBounds.height){
        draggingSelection = true;
        dragOffset.x = p.x - selectionBounds.x;
        dragOffset.y = p.y - selectionBounds.y;
        // Copy the data
        selectionData = ctx.getImageData(selectionBounds.x, selectionBounds.y, selectionBounds.width, selectionBounds.height);
        // Clear the area
        ctx.clearRect(selectionBounds.x, selectionBounds.y, selectionBounds.width, selectionBounds.height);
        drawing = true; // To allow mousemove
      } else {
        // Deselect
        selectionActive = false;
        selectionBounds = null;
        selectionData = null;
        // Redraw canvas to remove outline - restore from history
        if(history.length > 0){
          const img = new Image();
          img.onload = () => {
            canvasCtx.clearRect(0,0,drawCanvas.width,drawCanvas.height);
            canvasCtx.drawImage(img,0,0);
          };
          img.src = history[historyStep];
        }
      }
    }
  } else if(eyedropperMode){
    // Get color from canvas
    const imageData = ctx.getImageData(p.x, p.y, 1, 1);
    const [r, g, b] = imageData.data;
    color = `rgb(${r},${g},${b})`;
    // Add to recent colors
    if(!recentColors.includes(color)){
      recentColors.unshift(color);
      if(recentColors.length > 8) recentColors.pop();
    }
    eyedropperMode = false;
    drawCanvas.style.cursor = 'default';
    document.getElementById('eyedropperBtn').classList.remove('active');
    // Update displays if color panel is open
    const hexInput = document.getElementById('hexInput');
    const rgbDisplay = document.getElementById('rgbDisplay');
    if(hexInput){
      hexInput.value = rgbToHex(color);
      rgbDisplay.value = color;
      const colorPreview = document.getElementById('colorPreview');
      if(colorPreview){
        const ctx = colorPreview.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, colorPreview.width, colorPreview.height);
      }
    }
    drawing = false;
  } else if(tool === 'text'){
    // Create text input at click position
    if(textInputElement) textInputElement.remove();
    textInputElement = document.createElement('input');
    textInputElement.type = 'text';
    textInputElement.value = textValue || 'Type here';
    textInputElement.style.position = 'absolute';
    textInputElement.style.left = `${e.clientX}px`;
    textInputElement.style.top = `${e.clientY}px`;
    textInputElement.style.fontSize = `${fontSize}px`;
    textInputElement.style.fontFamily = fontFamily;
    textInputElement.style.fontWeight = textBold ? 'bold' : 'normal';
    textInputElement.style.fontStyle = textItalic ? 'italic' : 'normal';
    textInputElement.style.color = textColor;
    textInputElement.style.background = 'rgba(255,255,255,0.8)';
    textInputElement.style.border = '1px solid #000';
    textInputElement.style.padding = '2px';
    textInputElement.style.zIndex = '1000';
    document.body.appendChild(textInputElement);
    textInputElement.focus();
    textInputElement.select();

    const finalizeText = () => {
      if(textInputElement.value.trim()){
        textValue = textInputElement.value;
        const rect = textInputElement.getBoundingClientRect();
        const canvasRect = drawCanvas.getBoundingClientRect();
        const x = (rect.left - canvasRect.left) / zoom;
        const y = (rect.top - canvasRect.top) / zoom + fontSize;
        ctx.font = `${textBold ? 'bold ' : ''}${textItalic ? 'italic ' : ''}${fontSize}px ${fontFamily}`;
        ctx.fillStyle = textColor;
        ctx.textAlign = textAlign;
        ctx.fillText(textValue, x, y);
        saveHistory();
      }
      textInputElement.remove();
      textInputElement = null;
    };

    textInputElement.onblur = finalizeText;
    textInputElement.onkeydown = e => {
      if(e.key === 'Enter'){
        finalizeText();
      } else if(e.key === 'Escape'){
        textInputElement.remove();
        textInputElement = null;
      }
    };
    drawing = false;
  }
});

drawCanvas.addEventListener('mousemove',e=>{
  if(!drawing) return;
  const p=getPos(e);
  if(tool==='pencil' || tool==='brush' || tool==='eraser'){
    if(tool==='eraser' && eraserType==='shape'){
      ctx.beginPath();
      if(eraserShape==='circle'){
        ctx.arc(p.x,p.y,eraserSize/2,0,Math.PI*2);
      } else {
        ctx.rect(p.x-eraserSize/2,p.y-eraserSize/2,eraserSize,eraserSize);
      }
      ctx.fill();
    } else {
      ctx.lineTo(p.x,p.y);
      ctx.stroke();
    }
  } else if(tool === 'select' && draggingSelection && selectionData && history.length > 0){
    const newX = p.x - dragOffset.x;
    const newY = p.y - dragOffset.y;
    // Restore canvas from last history
    const img = new Image();
    img.onload = () => {
      canvasCtx.clearRect(0,0,drawCanvas.width,drawCanvas.height);
      canvasCtx.drawImage(img,0,0);
      // Draw selection data at new position
      canvasCtx.putImageData(selectionData, newX, newY);
      // Update bounds
      selectionBounds.x = newX;
      selectionBounds.y = newY;
      // Draw outline
      drawSelectionOutline();
    };
    img.src = history[historyStep];
  }
  renderLayers();
});

window.addEventListener('mouseup',e=>{
  if(drawing){
    if(tool === 'shapes'){
      const endPos = getPos(e);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      if(shapeMode === 'filled' || shapeMode === 'both'){
        ctx.fillStyle = fillColor;
      }
      if(shapeType === 'rect'){
        const w = endPos.x - startPos.x;
        const h = endPos.y - startPos.y;
        if(cornerRadius > 0){
          // Rounded rectangle
          ctx.beginPath();
          ctx.roundRect(startPos.x, startPos.y, w, h, cornerRadius);
          if(shapeMode === 'filled' || shapeMode === 'both') ctx.fill();
          if(shapeMode === 'outline' || shapeMode === 'both') ctx.stroke();
        } else {
          if(shapeMode === 'filled' || shapeMode === 'both') ctx.fillRect(startPos.x, startPos.y, w, h);
          if(shapeMode === 'outline' || shapeMode === 'both') ctx.strokeRect(startPos.x, startPos.y, w, h);
        }
      } else if(shapeType === 'circle'){
        const radius = Math.sqrt((endPos.x - startPos.x)**2 + (endPos.y - startPos.y)**2);
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, 2*Math.PI);
        if(shapeMode === 'filled' || shapeMode === 'both') ctx.fill();
        if(shapeMode === 'outline' || shapeMode === 'both') ctx.stroke();
      } else if(shapeType === 'triangle'){
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(endPos.x, startPos.y);
        ctx.lineTo((startPos.x + endPos.x)/2, endPos.y);
        ctx.closePath();
        if(shapeMode === 'filled' || shapeMode === 'both') ctx.fill();
        if(shapeMode === 'outline' || shapeMode === 'both') ctx.stroke();
      } else if(shapeType === 'line'){
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(endPos.x, endPos.y);
        ctx.stroke();
      } else if(shapeType === 'polygon'){
        // Simple regular polygon
        const centerX = (startPos.x + endPos.x) / 2;
        const centerY = (startPos.y + endPos.y) / 2;
        const radius = Math.sqrt((endPos.x - startPos.x)**2 + (endPos.y - startPos.y)**2) / 2;
        ctx.beginPath();
        for(let i = 0; i < polygonSides; i++){
          const angle = (i / polygonSides) * 2 * Math.PI;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          if(i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        if(shapeMode === 'filled' || shapeMode === 'both') ctx.fill();
        if(shapeMode === 'outline' || shapeMode === 'both') ctx.stroke();
      } else if(shapeType === 'star'){
        // Simple star
        const centerX = (startPos.x + endPos.x) / 2;
        const centerY = (startPos.y + endPos.y) / 2;
        const outerRadius = Math.sqrt((endPos.x - startPos.x)**2 + (endPos.y - startPos.y)**2) / 2;
        const innerRadius = outerRadius * 0.5;
        ctx.beginPath();
        for(let i = 0; i < 10; i++){
          const angle = (i * Math.PI) / 5;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          if(i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        if(shapeMode === 'filled' || shapeMode === 'both') ctx.fill();
        if(shapeMode === 'outline' || shapeMode === 'both') ctx.stroke();
      }
    } else if(tool === 'select' && !draggingSelection){
      // Creating new selection
      const endPos = getPos(e);
      selectionBounds = {x: Math.min(startPos.x, endPos.x), y: Math.min(startPos.y, endPos.y), width: Math.abs(endPos.x - startPos.x), height: Math.abs(endPos.y - startPos.y)};
      if(selectionBounds.width > 0 && selectionBounds.height > 0){
        selectionActive = true;
        drawSelectionOutline();
      }
    }
    if(!draggingSelection){
      saveHistory();
    }
  }
  if(draggingSelection){
    // Finish dragging
    draggingSelection = false;
    saveHistory();
  }
  drawing=false;
  switchToCanvasContext();
  ctx.closePath();
  ctx.globalCompositeOperation='source-over';
  ctx.globalAlpha=1;
});

function renderToolOptions(toolName){
  const container=document.getElementById('toolOptionsContent');
  let html='';
  switch(toolName){
    case 'pencil':
      html=`<div class="pencil-panel">
        <section class="pencil-section"><h4>Tool Presets</h4>${pencilPresets.concat(customPencilPresets).map(p=>`<button class="preset-btn" data-preset="${p.name}">${p.name}</button>`).join('')}<button id="addCustomPresetBtn" class="preset-btn">+ Save</button></section>
        <section class="pencil-section"><h4>Adjustable Controls</h4>
          <div class="option-row"><label>Size</label><input id="pencilSize" type="range" min="1" max="40" value="${pencilSize}" /></div>
          <div class="option-row"><label>Hardness</label><input id="pencilHardness" type="range" min="1" max="100" value="${pencilHardness}" /></div>
          <div class="option-row"><label>Opacity</label><input id="pencilOpacity" type="range" min="0" max="100" value="${Math.round(pencilOpacity*100)}" /></div>
          <div class="option-row"><label>Pressure</label><label class="toggle-switch"><input type="checkbox" id="pencilPressure" ${pencilPressure?'checked':''}><span class="slider"></span></label></div>
        </section>
        <section class="pencil-section"><h4>Color</h4>
          <div class="option-row"><label>Picker</label><input type="color" id="pencilColor" value="${rgbToHex(color)}" /></div>
          <div class="option-row"><label>Hex</label><input type="text" id="pencilHex" value="${rgbToHex(color)}" /></div>
          <div class="option-row"><label>RGB</label><input type="text" id="pencilRGB" value="${color}" readonly /></div>
          <div class="swatch-row" id="pencilSwatches"></div>
        </section>
        <section class="pencil-section"><h4>Preview</h4><canvas id="pencilPreview" width="240" height="60" class="preview-canvas"></canvas></section>
        <section class="pencil-section actions"><button id="resetPencilBtn" class="preset-btn">Reset to Default</button><button id="savePresetBtn" class="preset-btn">Save Preset</button></section>
      </div>`;
      break;
    case 'brush':
      html=`<div class="brush-panel">
        <section class="brush-section"><h4>Brush Presets</h4>${brushPresets.concat(customBrushPresets).map(b=>`<button class="preset-btn" data-brush="${b.name}">${b.name}</button>`).join('')}<button id="saveBrushPresetBtn" class="preset-btn">+ Save</button></section>
        <section class="brush-section"><h4>Adjustable Controls</h4>
          <div class="option-row"><label>Size</label><input id="brushSize" type="range" min="1" max="100" value="${brushSize}" /></div>
          <div class="option-row"><label>Opacity</label><input id="brushOpacity" type="range" min="0" max="100" value="${Math.round(brushOpacity*100)}" /></div>
          <div class="option-row"><label>Flow</label><input id="brushFlow" type="range" min="0" max="100" value="${Math.round(brushFlow*100)}" /></div>
          <div class="option-row"><label>Hardness</label><input id="brushHardness" type="range" min="0" max="100" value="${brushHardness}" /></div>
          <div class="option-row"><label>Pressure</label><label class="toggle-switch"><input type="checkbox" id="brushPressure" ${brushPressure?'checked':''}><span class="slider"></span></label></div>
        </section>
        <section class="brush-section"><h4>Color & Effects</h4>
          <div class="option-row"><label>Color</label><input type="color" id="brushColor" value="${rgbToHex(color)}" /></div>
          <div class="option-row"><label>Hex</label><input id="brushHex" type="text" value="${rgbToHex(color)}" /></div>
          <div class="option-row"><label>RGB</label><input id="brushRGB" type="text" value="${color}" readonly /></div>
          <div class="option-row"><label>Blend Mode</label><select id="brushBlend"><option value="normal">Normal</option><option value="multiply">Multiply</option><option value="overlay">Overlay</option><option value="screen">Screen</option></select></div>
          <div class="option-row"><label>Texture</label><select id="brushTexture"><option value="none">None</option><option value="grain">Grain</option><option value="paper">Paper</option><option value="fabric">Fabric</option></select></div>
        </section>
        <section class="brush-section"><h4>Preview</h4><canvas id="brushPreview" width="240" height="60" class="preview-canvas"></canvas></section>
        <section class="brush-section actions"><button id="resetBrushBtn" class="preset-btn">Reset to Default</button><button id="saveBrushPresetBtn" class="preset-btn">Save Preset</button></section>
      </div>`;
      break;
    case 'eraser':
      html=`<div class="eraser-panel">
        <section class="eraser-section"><h4>Eraser Types</h4>
          <button class="eraser-type-btn preset-btn" data-type="soft">Soft Eraser</button>
          <button class="eraser-type-btn preset-btn" data-type="hard">Hard Eraser</button>
          <button class="eraser-type-btn preset-btn" data-type="shape">Shape Eraser</button>
          <button class="eraser-type-btn preset-btn" data-type="stroke">Stroke Eraser</button>
        </section>
        <section class="eraser-section"><h4>Adjustable Controls</h4>
          <div class="option-row"><label>Size</label><input id="eraserSize" type="range" min="1" max="100" value="${eraserSize}" /></div>
          <div class="option-row"><label>Opacity</label><input id="eraserOpacity" type="range" min="0" max="100" value="${Math.round(eraserOpacity*100)}" /></div>
          <div class="option-row"><label>Pressure</label><label class="toggle-switch"><input type="checkbox" id="eraserPressure" ${eraserPressure?'checked':''}><span class="slider"></span></label></div>
          <div class="option-row"><label>Shape</label><select id="eraserShape"><option value="circle" ${eraserShape==='circle'?'selected':''}>Circle</option><option value="square" ${eraserShape==='square'?'selected':''}>Square</option></select></div>
        </section>
        <section class="eraser-section"><h4>Preview</h4><canvas id="eraserPreview" width="240" height="60" class="preview-canvas"></canvas></section>
        <section class="eraser-section actions"><button id="resetEraserBtn" class="preset-btn">Reset to Default</button><button id="saveEraserPresetBtn" class="preset-btn">Save Preset</button></section>
      </div>`;
      break;
    case 'select':
      html=`<div class="select-panel">
        <section class="select-section"><h4>Selection Types</h4>
          <button class="select-type-btn preset-btn" data-type="lasso">Lasso Tool</button>
          <button class="select-type-btn preset-btn" data-type="marquee">Marquee Tool</button>
          <button class="select-type-btn preset-btn" data-type="magic">Magic Wand</button>
          <button class="select-type-btn preset-btn" data-type="polygonal">Polygonal Lasso</button>
        </section>
        <section class="select-section"><h4>Selection Controls</h4>
          <div class="option-row"><label>Add to Selection</label><span class="hint">Hold Shift</span></div>
          <div class="option-row"><label>Subtract from Selection</label><span class="hint">Hold Alt</span></div>
          <div class="option-row"><label>Invert Selection</label><button id="invertSelectionBtn" class="preset-btn">Invert</button></div>
          <div class="option-row"><label>Feathering</label><input id="feathering" type="range" min="0" max="50" value="0" /></div>
        </section>
        <section class="select-section"><h4>Transform Options</h4>
          <div class="option-row"><label>Move</label><span class="hint">Drag selected area</span></div>
          <div class="option-row"><label>Scale</label><input id="scaleX" type="range" min="10" max="200" value="100" /> <input id="scaleY" type="range" min="10" max="200" value="100" /></div>
          <div class="option-row"><label>Rotate</label><input id="rotateAngle" type="range" min="-180" max="180" value="0" /></div>
          <div class="option-row"><label>Flip</label><button id="flipHBtn" class="preset-btn">Horizontal</button><button id="flipVBtn" class="preset-btn">Vertical</button></div>
          <div class="option-row"><label>Skew</label><input id="skewX" type="range" min="-50" max="50" value="0" /> <input id="skewY" type="range" min="-50" max="50" value="0" /></div>
        </section>
        <section class="select-section"><h4>Extras</h4>
          <div class="option-row"><label>Snap to Grid</label><label class="toggle-switch"><input type="checkbox" id="snapToGrid"><span class="slider"></span></label></div>
          <div class="option-row"><label>Selection Preview</label></div>
          <canvas id="selectionPreview" width="200" height="60" class="preview-canvas"></canvas>
          <div class="option-row"><label>Save Selection</label><button id="saveSelectionBtn" class="preset-btn">Save</button></div>
        </section>
      </div>`;
      break;
    case 'shapes':
      html=`<div class="shapes-panel">
        <section class="shapes-section"><h4>Basic Shapes</h4>
          <button class="shape-type-btn preset-btn ${shapeType === 'rect' ? 'active' : ''}" data-shape="rect">Rectangle</button>
          <button class="shape-type-btn preset-btn ${shapeType === 'circle' ? 'active' : ''}" data-shape="circle">Circle</button>
          <button class="shape-type-btn preset-btn ${shapeType === 'line' ? 'active' : ''}" data-shape="line">Line</button>
          <button class="shape-type-btn preset-btn ${shapeType === 'polygon' ? 'active' : ''}" data-shape="polygon">Polygon</button>
          <button class="shape-type-btn preset-btn ${shapeType === 'star' ? 'active' : ''}" data-shape="star">Star</button>
          <button class="shape-type-btn preset-btn ${shapeType === 'triangle' ? 'active' : ''}" data-shape="triangle">Triangle</button>
        </section>
        <section class="shapes-section"><h4>Drawing Modes</h4>
          <button class="mode-btn preset-btn ${shapeMode === 'outline' ? 'active' : ''}" data-mode="outline">Outline Only</button>
          <button class="mode-btn preset-btn ${shapeMode === 'filled' ? 'active' : ''}" data-mode="filled">Filled Shape</button>
          <button class="mode-btn preset-btn ${shapeMode === 'both' ? 'active' : ''}" data-mode="both">Stroke + Fill</button>
        </section>
        <section class="shapes-section"><h4>Style Controls</h4>
          <div class="option-row"><label>Stroke Width</label><input id="strokeWidth" type="range" min="0" max="20" value="${strokeWidth}" /></div>
          <div class="option-row"><label>Stroke Color</label><input type="color" id="strokeColor" value="${strokeColor}" /></div>
          <div class="option-row"><label>Fill Color</label><input type="color" id="fillColor" value="${fillColor}" /></div>
          <div class="option-row"><label>Corner Radius</label><input id="cornerRadius" type="range" min="0" max="50" value="${cornerRadius}" /></div>
          <div class="option-row"><label>Polygon Sides</label><input id="polygonSides" type="number" min="3" max="12" value="${polygonSides}" /></div>
        </section>
        <section class="shapes-section"><h4>Placement & Alignment</h4>
          <div class="option-row"><label>Snap to Grid</label><label class="toggle-switch"><input type="checkbox" id="shapeSnapToGrid" ${shapeSnapToGrid?'checked':''}><span class="slider"></span></label></div>
          <button id="centerOnCanvasBtn" class="preset-btn">Center on Canvas</button>
          <button id="duplicateShapeBtn" class="preset-btn">Duplicate</button>
        </section>
        <section class="shapes-section"><h4>Preview</h4><canvas id="shapePreview" width="240" height="60" class="preview-canvas"></canvas></section>
        <section class="shapes-section actions"><button id="resetShapeBtn" class="preset-btn">Reset to Default</button><button id="saveShapePresetBtn" class="preset-btn">Save Preset</button></section>
      </div>`;
      break;
    case 'text':
      html=`<div class="text-panel">
        <section class="text-section"><h4>Basic Controls</h4>
          <div class="option-row"><label>Text</label><input type="text" id="textValue" placeholder="Enter text" value="${textValue}" /></div>
          <div class="option-row"><label>Font Family</label><select id="fontFamily"><option value="Arial" ${fontFamily==='Arial'?'selected':''}>Arial</option><option value="Times New Roman" ${fontFamily==='Times New Roman'?'selected':''}>Times New Roman</option><option value="Courier New" ${fontFamily==='Courier New'?'selected':''}>Courier New</option><option value="Georgia" ${fontFamily==='Georgia'?'selected':''}>Georgia</option><option value="Verdana" ${fontFamily==='Verdana'?'selected':''}>Verdana</option></select></div>
          <div class="option-row"><label>Font Size</label><input type="number" id="fontSize" min="8" max="200" value="${fontSize}" /></div>
        </section>
        <section class="text-section"><h4>Styling Options</h4>
          <div class="option-row"><label>Style</label><button id="textBold" class="toggle-btn ${textBold?'active':''}">B</button><button id="textItalic" class="toggle-btn ${textItalic?'active':''}">I</button></div>
          <div class="option-row"><label>Alignment</label><select id="textAlign"><option value="left" ${textAlign==='left'?'selected':''}>Left</option><option value="center" ${textAlign==='center'?'selected':''}>Center</option><option value="right" ${textAlign==='right'?'selected':''}>Right</option></select></div>
          <div class="option-row"><label>Color</label><input type="color" id="textColor" value="${textColor}" /></div>
        </section>
        <section class="text-section actions"><button id="resetTextBtn" class="preset-btn">Reset to Default</button><button id="saveTextPresetBtn" class="preset-btn">Save Preset</button></section>
      </div>`;
      break;
    case 'color':
      html=`<div class="color-panel">
        <section class="color-section"><h4>Color Wheel</h4>
          <canvas id="colorWheel" width="200" height="200" style="border:1px solid #ccc;cursor:crosshair;"></canvas>
          <div class="option-row"><label>Value</label><input id="valueSlider" type="range" min="0" max="100" value="100" /></div>
        </section>
        <section class="color-section"><h4>Color Picker</h4>
          <div class="option-row"><label>Hex</label><input type="text" id="hexInput" value="${rgbToHex(color)}" /></div>
          <div class="option-row"><label>RGB</label><input type="text" id="rgbDisplay" value="${color}" readonly /></div>
          <div class="option-row"><label>HSL</label><input type="text" id="hslDisplay" value="hsl(0,0%,0%)" readonly /></div>
          <div class="option-row"><label>Eyedropper</label><button id="eyedropperBtn" class="preset-btn">Pick Color</button></div>
          <div class="option-row"><label>Opacity</label><input id="opacitySlider" type="range" min="0" max="100" value="${opacity*100}" /></div>
        </section>
        <section class="color-section"><h4>Blend Modes</h4>
          <div class="option-row"><label>Mode</label><select id="blendModeSelect"><option value="source-over">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option><option value="darken">Darken</option><option value="lighten">Lighten</option></select></div>
        </section>
        <section class="color-section"><h4>Gradient Creator</h4>
          <div class="option-row"><label>Type</label><select id="gradientType"><option value="linear">Linear</option><option value="radial">Radial</option></select></div>
          <div class="option-row"><label>Stops</label><div id="gradientStops">${gradientStops.map((s,i)=>`<div class="stop" style="left:${s.pos*100}%;background:${s.color}" data-index="${i}"></div>`).join('')}</div></div>
          <canvas id="gradientPreview" width="200" height="20" style="border:1px solid #ccc;margin-top:4px;"></canvas>
        </section>
        <section class="color-section"><h4>Pattern Fill</h4>
          <div class="option-row"><label>Pattern</label><select id="patternSelect"><option value="none">None</option><option value="dots">Dots</option><option value="stripes">Stripes</option><option value="checker">Checker</option></select></div>
        </section>
        <section class="color-section"><h4>Recent Colors</h4>
          <div class="swatches" id="recentSwatches">${recentColors.map(c=>`<div class="swatch" style="background:${c}" data-color="${c}"></div>`).join('')}</div>
        </section>
        <section class="color-section"><h4>Preview</h4>
          <canvas id="colorPreview" width="200" height="40" style="border:1px solid #ccc;"></canvas>
        </section>
      </div>`;
      break;
    default:
      html='Select a tool from left toolbar to show options';
  }
  container.innerHTML=html;

  const sizeInput=document.getElementById('toolBrushSize');
  if(sizeInput){sizeInput.oninput=e=>{brushSize=+e.target.value;document.getElementById('toolBrushSize').value=brushSize;document.getElementById('brushSizeStatus').textContent=`Size: ${brushSize}`;}};
  const colorInput=document.getElementById('toolBrushColor');
  if(colorInput){colorInput.oninput=e=>{color=hexToRgb(e.target.value);}};
  const eraserInput=document.getElementById('toolEraserSize');
  if(eraserInput){eraserInput.oninput=e=>{eraserSize=+e.target.value/2;document.getElementById('brushSizeStatus').textContent=`Size: ${eraserSize}`;}};

  if(toolName === 'pencil'){
    const pencilSizeEl=document.getElementById('pencilSize');
    const pencilHardnessEl=document.getElementById('pencilHardness');
    const pencilOpacityEl=document.getElementById('pencilOpacity');
    const pencilPressureEl=document.getElementById('pencilPressure');
    const pencilColor=document.getElementById('pencilColor');
    const pencilHex=document.getElementById('pencilHex');
    const pencilRGB=document.getElementById('pencilRGB');
    const swatchContainer=document.getElementById('pencilSwatches');
    const previewCanvas=document.getElementById('pencilPreview');
    const previewCtx=previewCanvas.getContext('2d');

    const updatePreview=()=>{
      previewCtx.clearRect(0,0,previewCanvas.width,previewCanvas.height);
      previewCtx.strokeStyle=color;
      previewCtx.globalAlpha=pencilOpacity;
      previewCtx.lineWidth=pencilSize;
      previewCtx.lineCap='round';
      previewCtx.beginPath();
      previewCtx.moveTo(10,previewCanvas.height/2);
      previewCtx.lineTo(previewCanvas.width-10,previewCanvas.height/2);
      previewCtx.stroke();
      previewCtx.globalAlpha=1;
    };

    const syncPencilControls=()=>{
      pencilSize=+pencilSizeEl.value;
      pencilHardness=+pencilHardnessEl.value;
      pencilOpacity=+pencilOpacityEl.value/100;
      pencilPressure=pencilPressureEl.checked;
      color=hexToRgb(pencilColor.value);
      pencilHex.value=rgbToHex(color);
      pencilRGB.value=color;
      document.getElementById('brushSizeStatus').textContent=`Size: ${pencilSize}`;
      updatePreview();
    };

    ['input','change'].forEach(evt=>{
      pencilSizeEl.addEventListener(evt,syncPencilControls);
      pencilHardnessEl.addEventListener(evt,()=>{pencilHardness=+pencilHardnessEl.value;updatePreview();});
      pencilOpacityEl.addEventListener(evt,()=>{pencilOpacity=+pencilOpacityEl.value/100;updatePreview();});
      pencilPressureEl.addEventListener(evt,()=>{pencilPressure=pencilPressureEl.checked;});
      pencilColor.addEventListener(evt,()=>{color=hexToRgb(pencilColor.value);pencilHex.value=rgbToHex(color);pencilRGB.value=color;updatePreview();});
      pencilHex.addEventListener('change',()=>{let v=pencilHex.value; if(/^#([0-9A-Fa-f]{6})$/.test(v)){color=hexToRgb(v);pencilColor.value=v;pencilRGB.value=color;updatePreview();}});
    });

    const presets=pencilPresets.concat(customPencilPresets);
    container.querySelectorAll('.preset-btn').forEach(pbtn=>{
      pbtn.addEventListener('click',e=>{
        const p=pencilPresets.concat(customPencilPresets).find(ps=>ps.name===e.currentTarget.dataset.preset);
        if(p){
          pencilSize=p.size; pencilHardness=p.hardness; pencilOpacity=p.opacity; color=p.color;
          selectedPencilPreset=p.name;
          pencilSizeEl.value=pencilSize; pencilHardnessEl.value=pencilHardness; pencilOpacityEl.value=Math.round(pencilOpacity*100);
          pencilColor.value=rgbToHex(color); pencilHex.value=rgbToHex(color); pencilRGB.value=color;
          container.querySelectorAll('.preset-btn').forEach(btn=>btn.classList.toggle('active', btn.dataset.preset===p.name));
          syncPencilControls();
        }
      });
    });

    document.getElementById('resetPencilBtn').onclick=()=>{
      const p=pencilPresets[0];
      pencilSize=p.size; pencilHardness=p.hardness; pencilOpacity=p.opacity; color=p.color;
      pencilSizeEl.value=pencilSize; pencilHardnessEl.value=pencilHardness; pencilOpacityEl.value=Math.round(pencilOpacity*100);
      pencilColor.value=rgbToHex(color); pencilHex.value=rgbToHex(color); pencilRGB.value=color;
      syncPencilControls();
    };

    document.getElementById('savePresetBtn').onclick=()=>{
      const name=prompt('Preset name');
      if(!name) return;
      const custom={name, size:pencilSize, hardness:pencilHardness, opacity:pencilOpacity, color:color, style:'custom'};
      customPencilPresets.push(custom);
      renderToolOptions('pencil');
    };

    const defaults=['#000000','#333333','#666666','#999999','#cccccc'];
    swatchContainer.innerHTML='';
    defaults.forEach(c=>{const b=document.createElement('button');b.className='swatch';b.style.background=c; b.onclick=()=>{color=hexToRgb(c);pencilColor.value=c;pencilHex.value=c;pencilRGB.value=color;updatePreview();};swatchContainer.appendChild(b);});

    updatePreview();
  }

  if(toolName === 'brush'){
    const brushSizeEl=document.getElementById('brushSize');
    const brushOpacityEl=document.getElementById('brushOpacity');
    const brushFlowEl=document.getElementById('brushFlow');
    const brushHardnessEl=document.getElementById('brushHardness');
    const brushPressureEl=document.getElementById('brushPressure');
    const brushColorEl=document.getElementById('brushColor');
    const brushHexEl=document.getElementById('brushHex');
    const brushRGBEl=document.getElementById('brushRGB');
    const brushBlendEl=document.getElementById('brushBlend');
    const brushTextureEl=document.getElementById('brushTexture');
    const brushPreview=document.getElementById('brushPreview');
    const brushPreviewCtx=brushPreview.getContext('2d');

    const updateBrushPreview=()=>{
      brushPreviewCtx.clearRect(0,0,brushPreview.width,brushPreview.height);
      brushPreviewCtx.globalCompositeOperation=brushBlend;
      brushPreviewCtx.strokeStyle=color;
      brushPreviewCtx.globalAlpha=brushOpacity;
      brushPreviewCtx.lineWidth=brushSize;
      brushPreviewCtx.lineCap='round';
      brushPreviewCtx.beginPath();
      brushPreviewCtx.moveTo(10, 45);
      brushPreviewCtx.lineTo(230, 45);
      brushPreviewCtx.stroke();
      brushPreviewCtx.globalCompositeOperation='source-over';
      brushPreviewCtx.globalAlpha=1;
    };

    const brushSync=()=>{
      brushSize=+brushSizeEl.value;
      brushOpacity=+brushOpacityEl.value/100;
      brushFlow=+brushFlowEl.value/100;
      brushHardness=+brushHardnessEl.value;
      brushPressure=brushPressureEl.checked;
      color=hexToRgb(brushColorEl.value);
      brushBlend=brushBlendEl.value;
      brushTexture=brushTextureEl.value;
      brushHexEl.value=rgbToHex(color);
      brushRGBEl.value=color;
      document.getElementById('brushSizeStatus').textContent=`Size: ${brushSize}`;
      updateBrushPreview();
    };

    [brushSizeEl, brushOpacityEl, brushFlowEl, brushHardnessEl, brushPressureEl, brushColorEl, brushBlendEl, brushTextureEl].forEach(el=>{
      if(!el) return;
      el.addEventListener('input',brushSync);
      el.addEventListener('change',brushSync);
    });

    brushHexEl.addEventListener('change',()=>{if(/^#([0-9a-fA-F]{6})$/.test(brushHexEl.value)){color=hexToRgb(brushHexEl.value);brushColorEl.value=brushHexEl.value;brushRGBEl.value=color;updateBrushPreview();}});

    document.querySelectorAll('.preset-btn[data-brush]').forEach(btn=>{btn.addEventListener('click',e=>{const p=brushPresets.concat(customBrushPresets).find(x=>x.name===e.currentTarget.dataset.brush); if(!p) return; brushSize=p.size; brushHardness=p.hardness; brushOpacity=p.opacity; brushFlow=p.flow; brushPressure=false; color=p.color; brushBlend='normal'; brushTexture='none'; brushSizeEl.value=brushSize; brushOpacityEl.value=Math.round(brushOpacity*100); brushFlowEl.value=Math.round(brushFlow*100); brushHardnessEl.value=brushHardness; brushColorEl.value=rgbToHex(color); brushHexEl.value=rgbToHex(color); brushRGBEl.value=color; brushBlendEl.value=brushBlend; brushTextureEl.value=brushTexture; document.querySelectorAll('.preset-btn[data-brush]').forEach(b=>b.classList.toggle('active', b.dataset.brush===p.name)); brushSync();});});

    document.getElementById('resetBrushBtn').onclick=()=>{const p=brushPresets[0];brushSize=p.size;brushHardness=p.hardness;brushOpacity=p.opacity;brushFlow=p.flow;color=p.color;brushBlend='normal';brushTexture='none';brushSizeEl.value=brushSize;brushOpacityEl.value=Math.round(brushOpacity*100);brushFlowEl.value=Math.round(brushFlow*100);brushHardnessEl.value=brushHardness;brushColorEl.value=rgbToHex(color);brushHexEl.value=rgbToHex(color);brushRGBEl.value=color;brushBlendEl.value=brushBlend;brushTextureEl.value=brushTexture;brushSync();};

    document.getElementById('saveBrushPresetBtn').onclick=()=>{const name=prompt('Brush preset name'); if(!name) return; customBrushPresets.push({name,size:brushSize,hardness:brushHardness,opacity:brushOpacity,flow:brushFlow,color,style:'custom'}); renderToolOptions('brush');};
    document.getElementById('saveBrushPresetBtn').onclick=()=>{const name=prompt('Brush preset name'); if(!name) return; customBrushPresets.push({name,size:brushSize,hardness:brushHardness,opacity:brushOpacity,flow:brushFlow,color,style:'custom'}); renderToolOptions('brush');};

    brushSync();
  }

  if(toolName === 'eraser'){
    const eraserTypeButtons=document.querySelectorAll('.eraser-type-btn');
    const eraserSizeEl=document.getElementById('eraserSize');
    const eraserOpacityEl=document.getElementById('eraserOpacity');
    const eraserPressureEl=document.getElementById('eraserPressure');
    const eraserShapeEl=document.getElementById('eraserShape');
    const eraserPreview=document.getElementById('eraserPreview');
    const eraserPreviewCtx=eraserPreview.getContext('2d');

    const updateEraserPreview=()=>{
      eraserPreviewCtx.clearRect(0,0,eraserPreview.width,eraserPreview.height);
      eraserPreviewCtx.fillStyle='rgba(0,0,0,'+eraserOpacity+')';
      if(eraserType==='shape' && eraserShape==='square'){
        eraserPreviewCtx.fillRect(30,30,eraserSize,eraserSize);
      } else {
        eraserPreviewCtx.beginPath();
        if(eraserShape==='circle') eraserPreviewCtx.arc(120,40,eraserSize/2,0,Math.PI*2);
        else eraserPreviewCtx.rect(120-eraserSize/2,40-eraserSize/2,eraserSize,eraserSize);
        eraserPreviewCtx.fill();
      }
    };

    const syncEraserControls=()=>{
      eraserSize=+eraserSizeEl.value;
      eraserOpacity=+eraserOpacityEl.value/100;
      eraserPressure=eraserPressureEl.checked;
      eraserShape=eraserShapeEl.value;
      eraserTypeButtons.forEach(btn=>btn.classList.toggle('active',btn.dataset.type===eraserType));
      updateEraserPreview();
    };

    eraserTypeButtons.forEach(btn=>{btn.addEventListener('click',()=>{eraserType=btn.dataset.type; eraserTypeButtons.forEach(b=>b.classList.toggle('active',b===btn)); syncEraserControls();});});

    eraserSizeEl.oninput=syncEraserControls;
    eraserOpacityEl.oninput=syncEraserControls;
    eraserPressureEl.onchange=syncEraserControls;
    eraserShapeEl.onchange=syncEraserControls;

    document.getElementById('resetEraserBtn').onclick=()=>{eraserType='hard'; eraserSize=20; eraserOpacity=1; eraserPressure=false; eraserShape='circle'; eraserSizeEl.value=eraserSize; eraserOpacityEl.value=100; eraserPressureEl.checked=false; eraserShapeEl.value='circle'; syncEraserControls();};

    document.getElementById('saveEraserPresetBtn').onclick=()=>{const name=prompt('Eraser preset name'); if(!name) return; const customEraserPresets=[]; customEraserPresets.push({name,size:eraserSize,opacity:eraserOpacity,type:eraserType,shape:eraserShape,style:'custom'}); renderToolOptions('eraser');};

    syncEraserControls();
  }

  if(toolName === 'shapes'){
    const shapeTypeButtons = document.querySelectorAll('.shape-type-btn');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const strokeWidthEl = document.getElementById('strokeWidth');
    const strokeColorEl = document.getElementById('strokeColor');
    const fillColorEl = document.getElementById('fillColor');
    const cornerRadiusEl = document.getElementById('cornerRadius');
    const polygonSidesEl = document.getElementById('polygonSides');
    const shapeSnapToGridEl = document.getElementById('shapeSnapToGrid');
    const shapePreview = document.getElementById('shapePreview');
    const shapePreviewCtx = shapePreview.getContext('2d');

    const updateShapePreview = () => {
      shapePreviewCtx.clearRect(0, 0, shapePreview.width, shapePreview.height);
      shapePreviewCtx.strokeStyle = strokeColor;
      shapePreviewCtx.fillStyle = fillColor;
      shapePreviewCtx.lineWidth = strokeWidth;
      if(shapeMode !== 'outline') shapePreviewCtx.fillRect(40, 15, 160, 30);
      if(shapeMode !== 'filled') shapePreviewCtx.strokeRect(40, 15, 160, 30);
    };

    const syncShapeControls = () => {
      strokeWidth = +strokeWidthEl.value;
      cornerRadius = +cornerRadiusEl.value;
      polygonSides = +polygonSidesEl.value;
      shapeSnapToGrid = shapeSnapToGridEl.checked;
      updateShapePreview();
    };

    shapeTypeButtons.forEach(btn => {
      btn.addEventListener('click', e => {
        shapeType = e.target.dataset.shape;
        shapeTypeButtons.forEach(b => b.classList.toggle('active', b.dataset.shape === shapeType));
        updateShapePreview();
      });
    });

    modeBtns.forEach(btn => {
      btn.addEventListener('click', e => {
        shapeMode = e.target.dataset.mode;
        modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === shapeMode));
        updateShapePreview();
      });
    });

    strokeWidthEl.oninput = syncShapeControls;
    cornerRadiusEl.oninput = syncShapeControls;
    polygonSidesEl.oninput = syncShapeControls;
    shapeSnapToGridEl.onchange = syncShapeControls;
    
    strokeColorEl.oninput = e => { strokeColor = e.target.value; updateShapePreview(); };
    fillColorEl.oninput = e => { fillColor = e.target.value; updateShapePreview(); };

    document.getElementById('centerOnCanvasBtn').onclick = () => alert('Center shape on canvas (MVP)');
    document.getElementById('duplicateShapeBtn').onclick = () => alert('Duplicate shape (MVP)');
    document.getElementById('resetShapeBtn').onclick = () => {
      shapeType = 'rect';
      shapeMode = 'outline';
      strokeWidth = 2;
      strokeColor = '#000000';
      fillColor = '#ffffff';
      cornerRadius = 0;
      polygonSides = 5;
      shapeSnapToGrid = false;
      strokeWidthEl.value = strokeWidth;
      cornerRadiusEl.value = cornerRadius;
      polygonSidesEl.value = polygonSides;
      strokeColorEl.value = strokeColor;
      fillColorEl.value = fillColor;
      shapeSnapToGridEl.checked = false;
      shapeTypeButtons.forEach(b => b.classList.toggle('active', b.dataset.shape === shapeType));
      modeBtns.forEach(b => b.classList.remove('active'));
      updateShapePreview();
    };
    document.getElementById('saveShapePresetBtn').onclick = () => alert('Save shape preset (MVP)');

    syncShapeControls();
  }
  if(toolName === 'text'){
    const textValueEl = document.getElementById('textValue');
    const fontFamilyEl = document.getElementById('fontFamily');
    const fontSizeEl = document.getElementById('fontSize');
    const textColorEl = document.getElementById('textColor');
    const textBoldEl = document.getElementById('textBold');
    const textItalicEl = document.getElementById('textItalic');
    const textAlignEl = document.getElementById('textAlign');

    const syncTextControls = () => {
      textValue = textValueEl.value;
      fontFamily = fontFamilyEl.value;
      fontSize = +fontSizeEl.value;
      textColor = textColorEl.value;
      textAlign = textAlignEl.value;
    };

    textValueEl.oninput = syncTextControls;
    fontFamilyEl.onchange = syncTextControls;
    fontSizeEl.oninput = syncTextControls;
    textColorEl.oninput = syncTextControls;
    textAlignEl.onchange = syncTextControls;

    textBoldEl.onclick = () => {
      textBold = !textBold;
      textBoldEl.classList.toggle('active', textBold);
    };
    textItalicEl.onclick = () => {
      textItalic = !textItalic;
      textItalicEl.classList.toggle('active', textItalic);
    };

    document.getElementById('resetTextBtn').onclick = () => {
      textValue = '';
      fontSize = 20;
      fontFamily = 'Arial';
      textColor = '#000000';
      textBold = false;
      textItalic = false;
      textAlign = 'left';
      textValueEl.value = textValue;
      fontFamilyEl.value = fontFamily;
      fontSizeEl.value = fontSize;
      textColorEl.value = textColor;
      textAlignEl.value = textAlign;
      textBoldEl.classList.remove('active');
      textItalicEl.classList.remove('active');
    };
    document.getElementById('saveTextPresetBtn').onclick = () => alert('Save text preset (MVP)');
  }
  if(toolName === 'color'){
    const hexInput = document.getElementById('hexInput');
    const rgbDisplay = document.getElementById('rgbDisplay');
    const hslDisplay = document.getElementById('hslDisplay');
    const eyedropperBtn = document.getElementById('eyedropperBtn');
    const opacitySlider = document.getElementById('opacitySlider');
    const valueSlider = document.getElementById('valueSlider');
    const blendModeSelect = document.getElementById('blendModeSelect');
    const gradientTypeEl = document.getElementById('gradientType');
    const gradientStopsEl = document.getElementById('gradientStops');
    const gradientPreview = document.getElementById('gradientPreview');
    const patternSelect = document.getElementById('patternSelect');
    const recentSwatches = document.getElementById('recentSwatches');
    const colorPreview = document.getElementById('colorPreview');
    const colorPreviewCtx = colorPreview.getContext('2d');
    const colorWheel = document.getElementById('colorWheel');
    const wheelCtx = colorWheel.getContext('2d');

    const updateColorPreview = () => {
      colorPreviewCtx.fillStyle = color;
      colorPreviewCtx.globalAlpha = opacity;
      colorPreviewCtx.fillRect(0, 0, colorPreview.width, colorPreview.height);
      colorPreviewCtx.globalAlpha = 1;
    };

    const updateGradientPreview = () => {
      const ctx = gradientPreview.getContext('2d');
      const grad = gradientTypeEl.value === 'linear' ? ctx.createLinearGradient(0, 0, gradientPreview.width, 0) : ctx.createRadialGradient(gradientPreview.width/2, gradientPreview.height/2, 0, gradientPreview.width/2, gradientPreview.height/2, gradientPreview.width/2);
      gradientStops.forEach(s => grad.addColorStop(s.pos, s.color));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, gradientPreview.width, gradientPreview.height);
    };

    const updateDisplays = () => {
      hexInput.value = rgbToHex(color);
      rgbDisplay.value = color;
      const hsv = rgbToHsv(...color.match(/\d+/g).map(Number));
      hslDisplay.value = `hsl(${Math.round(hsv.h)},${Math.round(hsv.s)}%,${Math.round(hsv.v)}%)`;
      hue = hsv.h;
      sat = hsv.s;
      val = hsv.v / 100;
      updateColorPreview();
      updateGradientPreview();
      drawColorWheel(colorWheel);
    };

    hexInput.onchange = e => {
      const val = e.target.value;
      if(/^#[0-9A-Fa-f]{6}$/.test(val)){
        color = hexToRgb(val);
        updateDisplays();
      }
    };

    opacitySlider.oninput = e => {
      opacity = +e.target.value / 100;
      updateColorPreview();
    };

    valueSlider.oninput = e => {
      val = +e.target.value / 100;
      color = hsvToRgb(hue, sat, val * 100);
      updateDisplays();
    };

    blendModeSelect.onchange = e => {
      blendMode = e.target.value;
      ctx.globalCompositeOperation = blendMode;
    };

    gradientTypeEl.onchange = updateGradientPreview;

    gradientStopsEl.onclick = e => {
      if(e.target.classList.contains('stop')){
        const index = +e.target.dataset.index;
        const newColor = prompt('Enter color', gradientStops[index].color);
        if(newColor) gradientStops[index].color = newColor;
        updateGradientPreview();
      }
    };

    patternSelect.onchange = e => {
      patternType = e.target.value;
    };

    eyedropperBtn.onclick = () => {
      eyedropperMode = !eyedropperMode;
      eyedropperBtn.classList.toggle('active', eyedropperMode);
      drawCanvas.style.cursor = eyedropperMode ? 'crosshair' : 'default';
    };

    recentSwatches.onclick = e => {
      if(e.target.classList.contains('swatch')){
        color = e.target.dataset.color;
        updateDisplays();
      }
    };

    // Color wheel interaction
    let isDraggingWheel = false;
    colorWheel.onmousedown = e => {
      isDraggingWheel = true;
      updateColorFromWheel(e);
    };
    colorWheel.onmousemove = e => {
      if(isDraggingWheel) updateColorFromWheel(e);
    };
    colorWheel.onmouseup = () => isDraggingWheel = false;

    function updateColorFromWheel(e) {
      const rect = colorWheel.getBoundingClientRect();
      const x = e.clientX - rect.left - colorWheel.width / 2;
      const y = e.clientY - rect.top - colorWheel.height / 2;
      const angle = Math.atan2(y, x) * 180 / Math.PI;
      hue = angle < 0 ? angle + 360 : angle;
      const dist = Math.sqrt(x * x + y * y);
      const radius = Math.min(colorWheel.width, colorWheel.height) / 2 - 10;
      sat = Math.min(100, (dist / radius) * 100);
      color = hsvToRgb(hue, sat, val * 100);
      updateDisplays();
    }

    updateDisplays();
  }
  if(toolName === 'select'){
    const selectTypeButtons = document.querySelectorAll('.select-type-btn');
    selectTypeButtons.forEach(btn => {
      btn.addEventListener('click', e => {
        selectMode = e.target.dataset.type;
        selectTypeButtons.forEach(b => b.classList.toggle('active', b.dataset.type === selectMode));
      });
    });
    document.getElementById('invertSelectionBtn').onclick = () => alert('Invert selection (MVP)');
    document.getElementById('feathering').oninput = e => feathering = +e.target.value;
    document.getElementById('scaleX').oninput = e => scaleX = +e.target.value / 100;
    document.getElementById('scaleY').oninput = e => scaleY = +e.target.value / 100;
    document.getElementById('rotateAngle').oninput = e => rotateAngle = +e.target.value;
    document.getElementById('flipHBtn').onclick = () => alert('Flip horizontal (MVP)');
    document.getElementById('flipVBtn').onclick = () => alert('Flip vertical (MVP)');
    document.getElementById('skewX').oninput = e => skewX = +e.target.value;
    document.getElementById('skewY').oninput = e => skewY = +e.target.value;
    document.getElementById('snapToGrid').onchange = e => snapToGrid = e.target.checked;
    document.getElementById('saveSelectionBtn').onclick = () => alert('Save selection (MVP)');
  }
}

document.querySelectorAll('.tool-icons button').forEach(btn=>btn.addEventListener('click',e=>{document.querySelectorAll('.tool-icons button').forEach(b=>b.classList.remove('active')); e.currentTarget.classList.add('active'); tool=e.currentTarget.dataset.tool; document.getElementById('activeTool').textContent=`Tool: ${tool}`; if(tool==='eraser'){drawCanvas.classList.add('eraser-cursor');} else {drawCanvas.classList.remove('eraser-cursor');} renderToolOptions(tool);}));

function rgbToHex(rgb){
  if(rgb.startsWith('#')) return rgb;
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if(match){
    return '#' + ((1 << 24) + (+match[1] << 16) + (+match[2] << 8) + +match[3]).toString(16).slice(1);
  }
  return '#000000';
}

function setZoom(value){zoom=value; document.querySelector('.canvas-holder').style.transform=`scale(${zoom})`; document.getElementById('zoomLevel').textContent=`Zoom: ${Math.round(zoom*100)}%`; document.getElementById('zoomDisplay').textContent=`${Math.round(zoom*100)}%`;}

document.getElementById('zoomIn').onclick=()=>setZoom(Math.min(2,zoom+0.1));
document.getElementById('zoomOut').onclick=()=>setZoom(Math.max(0.4,zoom-0.1));
document.getElementById('fitToScreen').onclick=()=>setZoom(1);

document.getElementById('gridToggle').onclick=()=>{gridEnabled=!gridEnabled; drawBackgroundGrid(); document.getElementById('gridToggle').classList.toggle('active',gridEnabled);};

// Sidebar panel toggle handlers - toggle the specific panel
document.getElementById('gridOptions').onclick=()=>{
  const gridPanel = document.querySelector('.grid-panel-section .panel-body');
  if(gridPanel) {
    gridPanel.style.display = gridPanel.style.display === 'none' ? 'block' : 'none';
  }
};

document.getElementById('guidelineOptions').onclick=()=>{
  const guidelinesPanel = document.querySelector('.guidelines-panel-section .panel-body');
  if(guidelinesPanel) {
    guidelinesPanel.style.display = guidelinesPanel.style.display === 'none' ? 'block' : 'none';
  }
};

const gridEnableCheckbox=document.getElementById('gridEnableCheckbox');
if(gridEnableCheckbox){gridEnableCheckbox.checked=gridEnabled; gridEnableCheckbox.onchange=(e)=>{gridEnabled=e.target.checked; drawBackgroundGrid(); document.getElementById('gridToggle').classList.toggle('active',gridEnabled);};}

const gridGapEl=document.getElementById('gridGap');
if(gridGapEl){gridGapEl.value=gridGap; gridGapEl.oninput=(e)=>{gridGap=+e.target.value; drawBackgroundGrid();};}

const gridOpacityEl=document.getElementById('gridOpacity');
if(gridOpacityEl){gridOpacityEl.value=gridOpacity*100; gridOpacityEl.oninput=(e)=>{gridOpacity=+e.target.value/100; drawBackgroundGrid();};}

const gridColorPicker=document.getElementById('gridColorPicker');
if(gridColorPicker){gridColorPicker.value='#4080f0'; gridColorPicker.oninput=(e)=>{gridColor=`rgba(${parseInt(e.target.value.slice(1,3),16)},${parseInt(e.target.value.slice(3,5),16)},${parseInt(e.target.value.slice(5,7),16)},${gridOpacity})`; drawBackgroundGrid();};}

document.getElementById('undo').onclick=()=>undo();
document.getElementById('redo').onclick=()=>redo();

// Layer Management Buttons
document.getElementById('addLayerBtn').onclick=()=>addLayer();
document.getElementById('moveLayerBtn').onclick=()=>{
  const currentIdx = layers.findIndex(l => l.id === activeLayerId);
  // Move up (to higher index in array, which means up in visual order)
  if (currentIdx < layers.length - 1) {
    reorderLayers(currentIdx, currentIdx + 1);
  } else if (currentIdx > 0) {
    // If at top, move down instead
    reorderLayers(currentIdx, currentIdx - 1);
  }
};
const layerOpacityInput = document.getElementById('layerOpacityInput');
if(layerOpacityInput){
  layerOpacityInput.oninput=(e)=>{
    setLayerOpacity(activeLayerId, e.target.value);
    document.getElementById('opacityValue').textContent = e.target.value;
  };
}

const layerBlendModeSelect = document.getElementById('layerBlendMode');
if(layerBlendModeSelect){
  layerBlendModeSelect.onchange=(e)=>setLayerBlendMode(activeLayerId, e.target.value);
}

// Collaboration Panel State
let collaborators = []; // Will store active collaborators

document.querySelectorAll('.panel-section header').forEach(h=>h.addEventListener('click',()=>{const body=h.nextElementSibling; body.style.display=body.style.display==='none'?'block':'none';}));

// FILE MENU
// FILE MENU - WORKING IMPLEMENTATIONS
document.getElementById('newCanvasBtn').onclick=()=>{
  showCanvasSizeModal();
};

document.getElementById('openImageBtn').onclick=()=>{
  const input=document.createElement('input');
  input.type='file';
  input.accept='image/*';
  input.onchange=e=>{
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=event=>{
      const img=new Image();
      img.onload=()=>{
        canvasCtx.clearRect(0,0,drawCanvas.width,drawCanvas.height);
        canvasCtx.drawImage(img,0,0);
        saveHistory();
        console.log('✅ Image loaded to canvas');
      };
      img.src=event.target.result;
    };
    reader.readAsDataURL(file);
  };
  input.click();
};

document.getElementById('saveBtn').onclick=()=>{
  const username=document.cookie.split('; ').find(r=>r.startsWith('username='))?.split('=')[1]||'drawing';
  const imageData=drawCanvas.toDataURL('image/png');
  fetch('/save',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:`image=${encodeURIComponent(imageData)}`
  }).then(r=>r.text()).then(msg=>{
    console.log('✅ '+msg);
    alert('✅ Drawing saved successfully!');
  }).catch(e=>{
    console.error('❌ Save error:',e);
    alert('❌ Error saving drawing');
  });
};

document.getElementById('saveAsBtn').onclick=()=>{
  const filename=prompt('Enter filename for drawing:','drawing');
  if(!filename)return;
  const link=document.createElement('a');
  link.href=drawCanvas.toDataURL('image/png');
  link.download=`${filename}.png`;
  link.click();
  alert('✅ Drawing exported as '+filename+'.png');
};

document.getElementById('exportPNGBtn').onclick=()=>exportImage('PNG');
document.getElementById('exportJPGBtn').onclick=()=>exportImage('JPG');
document.getElementById('exportSVGBtn').onclick=()=>exportImage('SVG');
document.getElementById('exitBtn').onclick=()=>{if(confirm('Are you sure you want to exit?')) window.location.href='/';};

// EDIT MENU - WORKING IMPLEMENTATIONS
document.getElementById('undoMenuBtn').onclick=()=>undo();
document.getElementById('redoMenuBtn').onclick=()=>redo();
document.getElementById('clearCanvasBtn').onclick=()=>{
  if(confirm('Clear the entire canvas?')){
    canvasCtx.clearRect(0,0,drawCanvas.width,drawCanvas.height);
    console.log('✅ Canvas cleared');
  }
};

document.getElementById('copyBtn').onclick=()=>{
  drawCanvas.toBlob(blob=>{
    const item=new ClipboardItem({'image/png':blob});
    navigator.clipboard.write([item]).then(()=>{
      console.log('✅ Canvas copied to clipboard');
      alert('✅ Canvas copied to clipboard!');
    }).catch(e=>{
      console.error('❌ Copy error:',e);
      alert('❌ Failed to copy to clipboard');
    });
  },'image/png');
};

document.getElementById('pasteBtn').onclick=()=>{
  navigator.clipboard.read().then(items=>{
    for(let item of items){
      if(item.types.includes('image/png')){
        item.getType('image/png').then(blob=>{
          const reader=new FileReader();
          reader.onload=e=>{
            const img=new Image();
            img.onload=()=>{
              canvasCtx.drawImage(img,10,10);
              saveHistory();
              console.log('✅ Pasted from clipboard');
              alert('✅ Pasted from clipboard!');
            };
            img.src=e.target.result;
          };
          reader.readAsDataURL(blob);
        });
        return;
      }
    }
    alert('❌ No image found in clipboard');
  }).catch(e=>{
    console.error('❌ Paste error:',e);
    alert('❌ Failed to paste from clipboard');
  });
};

// VIEW MENU - WORKING IMPLEMENTATIONS
document.getElementById('zoomInMenuBtn').onclick=()=>document.getElementById('zoomIn').click();
document.getElementById('zoomOutMenuBtn').onclick=()=>document.getElementById('zoomOut').click();
document.getElementById('resetZoomMenuBtn').onclick=()=>setZoom(1);
document.getElementById('toggleGridMenuBtn').onclick=()=>document.getElementById('gridToggle').click();

// RULERS TOGGLE
let rulersVisible=false;
document.getElementById('showRulersBtn').onclick=()=>{
  rulersVisible=!rulersVisible;
  const rulerSize=40;
  if(rulersVisible){
    if(!window.rulerCanvas){
      window.rulerCanvas=document.createElement('canvas');
      window.rulerCanvas.id='rulerOverlay';
      window.rulerCanvas.width=drawCanvas.width;
      window.rulerCanvas.height=drawCanvas.height;
      window.rulerCanvas.style.position='absolute';
      window.rulerCanvas.style.pointerEvents='none';
      window.rulerCanvas.style.top=drawCanvas.offsetTop+'px';
      window.rulerCanvas.style.left=drawCanvas.offsetLeft+'px';
      window.rulerCanvas.style.zIndex='5';
      window.rulerCanvas.style.opacity='0.3';
      drawCanvas.parentElement.style.position='relative';
      drawCanvas.parentElement.appendChild(window.rulerCanvas);
      const rCtx=window.rulerCanvas.getContext('2d');
      rCtx.strokeStyle='#666';rCtx.fillStyle='#999';rCtx.font='10px Arial';
      for(let i=0;i<drawCanvas.width;i+=50){rCtx.fillRect(i,0,1,10);if(i%100===0)rCtx.fillText(i,i-8,20);}
      for(let i=0;i<drawCanvas.height;i+=50){rCtx.fillRect(0,i,10,1);if(i%100===0)rCtx.fillText(i,12,i+4);}
    }
    window.rulerCanvas.style.display='block';
    console.log('✅ Rulers shown');
    alert('✅ Rulers displayed');
  }else{
    if(window.rulerCanvas)window.rulerCanvas.style.display='none';
    console.log('✅ Rulers hidden');
    alert('✅ Rulers hidden');
  }
};

// CANVAS SIZE MODAL FUNCTIONS
let currentCanvasWidth=drawCanvas.width;
let currentCanvasHeight=drawCanvas.height;
let aspectRatioLocked=true;
let originalAspectRatio=currentCanvasWidth/currentCanvasHeight;

function showCanvasSizeModal(){
  try{
    const modal=document.getElementById('canvasSizeModal');
    if(!modal){console.error('❌ Canvas size modal not found');return;}
    modal.style.display='flex';
    modal.classList.add('active');
    updateCanvasPreview();
    console.log('✅ Canvas size modal shown');
  }catch(e){
    console.error('❌ Error showing canvas size modal:',e);
  }
}

function closeCanvasSizeModal(){
  try{
    const modal=document.getElementById('canvasSizeModal');
    if(!modal)return;
    modal.style.display='none';
    modal.classList.remove('active');
    console.log('✅ Canvas size modal closed');
  }catch(e){
    console.error('❌ Error closing modal:',e);
  }
}

function updateCanvasPreview(){
  const preview=document.getElementById('canvasPreview');
  if(preview){
    preview.textContent=`Current: ${currentCanvasWidth} × ${currentCanvasHeight}`;
  }
}

function resizeCanvas(newWidth,newHeight){
  try{
    if(newWidth<100||newHeight<100){
      alert('❌ Canvas size must be at least 100×100');
      return;
    }
    if(newWidth>5000||newHeight>5000){
      alert('❌ Canvas size must be less than 5000×5000');
      return;
    }
    
    // Create temporary canvas to preserve current drawing
    const tempCanvas=document.createElement('canvas');
    tempCanvas.width=currentCanvasWidth;
    tempCanvas.height=currentCanvasHeight;
    const tempCtx=tempCanvas.getContext('2d');
    tempCtx.drawImage(drawCanvas,0,0);
    
    // Resize main canvas
    drawCanvas.width=newWidth;
    drawCanvas.height=newHeight;
    currentCanvasWidth=newWidth;
    currentCanvasHeight=newHeight;
    
    // Restore drawing in top-left corner
    canvasCtx.drawImage(tempCanvas,0,0);
    
    // Resize grid canvas if exists
    const gridCanvas=document.getElementById('gridCanvas');
    if(gridCanvas){
      gridCanvas.width=newWidth;
      gridCanvas.height=newHeight;
      // Redraw grid
      const gridCtx=gridCanvas.getContext('2d');
      gridCtx.clearRect(0,0,newWidth,newHeight);
      if(gridEnabled){
        const size=gridSize;
        gridCtx.strokeStyle=gridColor;
        gridCtx.lineWidth=gridLineWidth;
        gridCtx.globalAlpha=gridOpacity/100;
        if(gridType==='square'){
          for(let i=0;i<newWidth;i+=size)gridCtx.beginPath(),gridCtx.moveTo(i,0),gridCtx.lineTo(i,newHeight),gridCtx.stroke();
          for(let i=0;i<newHeight;i+=size)gridCtx.beginPath(),gridCtx.moveTo(0,i),gridCtx.lineTo(newWidth,i),gridCtx.stroke();
        }else if(gridType==='dot'){
          for(let x=0;x<newWidth;x+=size)for(let y=0;y<newHeight;y+=size)gridCtx.fillRect(x,y,1,1);
        }
        gridCtx.globalAlpha=1;
      }
    }
    
    // Update ruler if visible
    if(window.rulerCanvas&&rulersVisible){
      window.rulerCanvas.width=newWidth;
      window.rulerCanvas.height=newHeight;
      window.rulerCanvas.style.width=newWidth+'px';
      window.rulerCanvas.style.height=newHeight+'px';
      const rCtx=window.rulerCanvas.getContext('2d');
      rCtx.clearRect(0,0,newWidth,newHeight);
      rCtx.strokeStyle='#666';rCtx.fillStyle='#999';rCtx.font='10px Arial';
      for(let i=0;i<newWidth;i+=50){rCtx.fillRect(i,0,1,10);if(i%100===0)rCtx.fillText(i,i-8,20);}
      for(let i=0;i<newHeight;i+=50){rCtx.fillRect(0,i,10,1);if(i%100===0)rCtx.fillText(i,12,i+4);}
    }
    
    saveHistory();
    updateCanvasPreview();
    console.log(`✅ Canvas resized to ${newWidth}×${newHeight}`);
  }catch(e){
    console.error('❌ Error resizing canvas:',e);
    alert('❌ Error resizing canvas: '+e.message);
  }
}

// Canvas Size Modal Event Listeners
document.getElementById('canvasSizeCloseBtn').onclick=()=>closeCanvasSizeModal();
document.getElementById('canvasSizeCancelBtn').onclick=()=>closeCanvasSizeModal();

document.getElementById('canvasSizeApplyBtn').onclick=()=>{
  const width=parseInt(document.getElementById('customWidth').value);
  const height=parseInt(document.getElementById('customHeight').value);
  if(isNaN(width)||isNaN(height)){
    alert('❌ Please enter valid width and height values');
    return;
  }
  resizeCanvas(width,height);
  closeCanvasSizeModal();
  alert(`✅ Canvas resized to ${width}×${height}`);
};

// Preset size buttons
document.querySelectorAll('.canvas-preset-btn').forEach(btn=>{
  btn.onclick=()=>{
    const width=parseInt(btn.dataset.width);
    const height=parseInt(btn.dataset.height);
    document.getElementById('customWidth').value=width;
    document.getElementById('customHeight').value=height;
    document.querySelectorAll('.canvas-preset-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    updateAspectRatio(width,height);
  };
});

// Aspect ratio locking
document.getElementById('lockAspectBtn').onclick=function(){
  aspectRatioLocked=!aspectRatioLocked;
  this.dataset.state=aspectRatioLocked;
  this.classList.toggle('active');
  if(aspectRatioLocked){
    const width=parseInt(document.getElementById('customWidth').value);
    originalAspectRatio=width/parseInt(document.getElementById('customHeight').value);
    console.log('✅ Aspect ratio locked');
  }else{
    console.log('✅ Aspect ratio unlocked');
  }
};

// Swap dimensions
document.getElementById('swapDimensionsBtn').onclick=()=>{
  const widthInput=document.getElementById('customWidth');
  const heightInput=document.getElementById('customHeight');
  const temp=widthInput.value;
  widthInput.value=heightInput.value;
  heightInput.value=temp;
  originalAspectRatio=parseInt(widthInput.value)/parseInt(heightInput.value);
  console.log('✅ Dimensions swapped');
};

// Custom width/height inputs
document.getElementById('customWidth').oninput=function(){
  if(aspectRatioLocked){
    const width=parseInt(this.value);
    if(!isNaN(width)){
      const height=Math.round(width/originalAspectRatio);
      document.getElementById('customHeight').value=height;
    }
  }
  document.querySelectorAll('.canvas-preset-btn').forEach(b=>b.classList.remove('active'));
};

document.getElementById('customHeight').oninput=function(){
  if(aspectRatioLocked){
    const height=parseInt(this.value);
    if(!isNaN(height)){
      const width=Math.round(height*originalAspectRatio);
      document.getElementById('customWidth').value=width;
    }
  }
  document.querySelectorAll('.canvas-preset-btn').forEach(b=>b.classList.remove('active'));
};

function updateAspectRatio(width,height){
  originalAspectRatio=width/height;
}

// Close modal when clicking outside
document.getElementById('canvasSizeModal').onclick=function(e){
  if(e.target===this)closeCanvasSizeModal();
};

// TOOLS MENU - direct selection
document.querySelectorAll('.tool-menu-item').forEach(btn=>{btn.onclick=e=>{tool=e.currentTarget.dataset.tool;document.querySelectorAll('.tool-icons button').forEach(b=>b.classList.remove('active'));const matchBtn=document.querySelector(`[data-tool="${tool}"]`);if(matchBtn)matchBtn.classList.add('active');document.getElementById('activeTool').textContent=`Tool: ${tool}`; if(tool==='eraser'){drawCanvas.classList.add('eraser-cursor');} else {drawCanvas.classList.remove('eraser-cursor');} renderToolOptions(tool);};});

// Toolbar icons - also allow selection
document.querySelectorAll('.tool-icons button').forEach(btn=>{btn.onclick=e=>{tool=e.currentTarget.dataset.tool;document.querySelectorAll('.tool-icons button').forEach(b=>b.classList.remove('active'));e.currentTarget.classList.add('active');document.getElementById('activeTool').textContent=`Tool: ${tool}`; if(tool==='eraser'){drawCanvas.classList.add('eraser-cursor');} else {drawCanvas.classList.remove('eraser-cursor');} renderToolOptions(tool);};});

document.getElementById('fillToolBtn').onclick=()=>{tool='fill';document.getElementById('activeTool').textContent=`Tool: fill`;renderToolOptions(tool);};
document.getElementById('eyedropperBtn').onclick=()=>{tool='eyedropper';document.getElementById('activeTool').textContent=`Tool: eyedropper`;renderToolOptions(tool);};

// ANIMATION PANEL - MVP Implementation
let frames=[];
let currentFrame=0;
let isAnimationPlaying=false;
let animationPlayInterval=null;
let onionSkinEnabled=false;
let frameRate=24;
let animationDuration=2;

function initAnimationPanel(){
  const frameList=document.getElementById('frameList');
  const animationPreview=document.getElementById('animationPreview');
  const previewCtx=animationPreview.getContext('2d');
  
  // Add Frame - captures current canvas
  document.getElementById('addFrameAnimBtn').onclick=()=>{
    frames.push({data:drawCanvas.toDataURL(),timestamp:Date.now()});
    currentFrame=frames.length-1;
    updateFrameList();
    previewFrame(currentFrame);
  };
  
  // Delete Frame - removes current frame
  document.getElementById('delFrameAnimBtn').onclick=()=>{
    if(frames.length>0){
      frames.splice(currentFrame,1);
      if(currentFrame>=frames.length)currentFrame=Math.max(0,frames.length-1);
      updateFrameList();
      if(frames.length>0)previewFrame(currentFrame);
      else previewCtx.clearRect(0,0,animationPreview.width,animationPreview.height);
    }
  };
  
  // Duplicate Frame - copies current frame
  document.getElementById('dupFrameAnimBtn').onclick=()=>{
    if(frames.length>0){
      const frameData={data:frames[currentFrame].data,timestamp:Date.now()};
      frames.splice(currentFrame+1,0,frameData);
      currentFrame++;
      updateFrameList();
      previewFrame(currentFrame);
    }
  };
  
  // Play Animation - cycles through frames at FPS rate
  document.getElementById('playAnimBtn').onclick=()=>{
    if(frames.length<2){alert('Need at least 2 frames to play');return;}
    if(isAnimationPlaying)return;
    isAnimationPlaying=true;
    let idx=0;
    const interval=1000/frameRate;
    animationPlayInterval=setInterval(()=>{
      previewFrame(idx%frames.length);
      idx++;
    },interval);
  };
  
  // Pause Animation - stops playback
  document.getElementById('pauseAnimBtn').onclick=()=>{
    if(animationPlayInterval){clearInterval(animationPlayInterval);animationPlayInterval=null;}
    isAnimationPlaying=false;
  };
  
  // Loop Toggle - Restarts animation from frame 0
  document.getElementById('loopAnimBtn').onclick=()=>{
    if(frames.length<2){alert('Need at least 2 frames');return;}
    document.getElementById('pauseAnimBtn').onclick();
    currentFrame=0;
    updateFrameList();
    previewFrame(0);
  };
  
  // FPS Slider Control - adjusts playback speed
  document.getElementById('fpsSlider').oninput=(e)=>{
    frameRate=parseInt(e.target.value);
    document.getElementById('fpsValue').textContent=frameRate;
    // If playing, restart with new FPS
    if(isAnimationPlaying){
      document.getElementById('pauseAnimBtn').onclick();
      document.getElementById('playAnimBtn').onclick();
    }
  };
  
  // Duration Input - sets animation length
  document.getElementById('durationInput').oninput=(e)=>{
    animationDuration=parseFloat(e.target.value);
  };
  
  // Onion Skin Toggle - shows previous frame faintly
  document.getElementById('onionSkinToggle').onclick=(e)=>{
    onionSkinEnabled=!onionSkinEnabled;
    e.target.classList.toggle('active');
    if(currentFrame>=0)previewFrame(currentFrame);
  };
  
  // Preview single frame in preview canvas
  function previewFrame(index){
    if(index<0||index>=frames.length)return;
    const img=new Image();
    img.onload=()=>{
      previewCtx.clearRect(0,0,animationPreview.width,animationPreview.height);
      previewCtx.drawImage(img,0,0,animationPreview.width,animationPreview.height);
      // Onion skin: show previous frame at 30% opacity
      if(onionSkinEnabled&&index>0){
        previewCtx.globalAlpha=0.3;
        const prevImg=new Image();
        prevImg.onload=()=>{
          previewCtx.drawImage(prevImg,0,0,animationPreview.width,animationPreview.height);
          previewCtx.globalAlpha=1;
        };
        prevImg.src=frames[index-1].data;
      }
    };
    img.src=frames[index].data;
  }
  
  // Update frame list thumbnails
  function updateFrameList(){
    frameList.innerHTML='';
    frames.forEach((frame,idx)=>{
      const thumb=document.createElement('div');
      thumb.className='frame-thumbnail'+(idx===currentFrame?' active':'');
      thumb.innerHTML=`<img src=\"${frame.data}\" alt=\"Frame ${idx+1}\"><div class=\"frame-num\">${idx+1}</div>`;
      thumb.onclick=()=>{currentFrame=idx;updateFrameList();previewFrame(currentFrame);};
      frameList.appendChild(thumb);
    });
  }
  
  // Sidebar animation icon handler
  const animToggleBtn=document.getElementById('animationOptions');
  if(animToggleBtn){
    animToggleBtn.onclick=()=>{
      const animPanel=document.querySelector('.animation-panel-section .panel-body');
      if(animPanel){
        animPanel.style.display=animPanel.style.display==='none'?'block':'none';
      }
    };
  }
}

// Menu button integration for top menu
document.getElementById('addFrameBtn').onclick=()=>{if(document.getElementById('addFrameAnimBtn'))document.getElementById('addFrameAnimBtn').click();};
document.getElementById('deleteFrameBtn').onclick=()=>{if(document.getElementById('delFrameAnimBtn'))document.getElementById('delFrameAnimBtn').click();};
document.getElementById('playAnimationBtn').onclick=()=>{if(document.getElementById('playAnimBtn'))document.getElementById('playAnimBtn').click();};
document.getElementById('stopAnimationBtn').onclick=()=>{if(document.getElementById('pauseAnimBtn'))document.getElementById('pauseAnimBtn').click();};

function exportImage(format){
  const link=document.createElement('a');
  if(format==='PNG'){
    link.href=drawCanvas.toDataURL('image/png');
    link.download='drawing.png';
  }else if(format==='JPG'){
    link.href=drawCanvas.toDataURL('image/jpeg',0.9);
    link.download='drawing.jpg';
  }else if(format==='SVG'){
    alert('SVG export - needs canvas2svg library (coming soon)');return;
  }
  link.click();
}

// Initialize Color Science Panel
function initColorSciencePanel(){
  // === COLOR CONVERSION UTILITIES ===
  const hexToRgb=(hex)=>{
    const result=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result?{r:parseInt(result[1],16),g:parseInt(result[2],16),b:parseInt(result[3],16)}:null;
  };
  const rgbToHex=(r,g,b)=>{
    return"#"+[r,g,b].map(x=>{const hex=x.toString(16);return hex.length===1?"0"+hex:hex;}).join('').toUpperCase();
  };
  const rgbToHsv=(r,g,b)=>{
    r/=255;g/=255;b/=255;
    const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
    let h=0;
    if(d!==0){
      if(max===r)h=((g-b)/d+(g<b?6:0))/6;
      else if(max===g)h=((b-r)/d+2)/6;
      else h=((r-g)/d+4)/6;
    }
    return{h:Math.round(h*360),s:Math.round((max===0?0:d/max)*100),v:Math.round(max*100)};
  };
  const hsvToRgb=(h,s,v)=>{
    h=h/360;s=s/100;v=v/100;
    const c=v*s,x=c*(1-Math.abs((h*6)%2-1)),m=v-c;
    let r,g,b;
    if(h<1/6){r=c;g=x;b=0;}
    else if(h<1/3){r=x;g=c;b=0;}
    else if(h<1/2){r=0;g=c;b=x;}
    else if(h<2/3){r=0;g=x;b=c;}
    else if(h<5/6){r=x;g=0;b=c;}
    else{r=c;g=0;b=x;}
    return{r:Math.round((r+m)*255),g:Math.round((g+m)*255),b:Math.round((b+m)*255)};
  };
  const rgbToHsl=(r,g,b)=>{
    r/=255;g/=255;b/=255;
    const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2;
    let h,s;
    if(max===min){h=s=0;}
    else{
      const d=max-min;
      s=l>0.5?d/(2-max-min):d/(max+min);
      if(max===r)h=((g-b)/d+(g<b?6:0))/6;
      else if(max===g)h=((b-r)/d+2)/6;
      else h=((r-g)/d+4)/6;
    }
    return{h:Math.round(h*360),s:Math.round(s*100),l:Math.round(l*100)};
  };
  const hslToRgb=(h,s,l)=>{
    h=h/360;s=s/100;l=l/100;
    const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h*6)%2-1)),m=l-c/2;
    let r,g,b;
    if(h<1/6){r=c;g=x;b=0;}
    else if(h<1/3){r=x;g=c;b=0;}
    else if(h<1/2){r=0;g=c;b=x;}
    else if(h<2/3){r=0;g=x;b=c;}
    else if(h<5/6){r=x;g=0;b=c;}
    else{r=c;g=0;b=x;}
    return{r:Math.round((r+m)*255),g:Math.round((g+m)*255),b:Math.round((b+m)*255)};
  };
  
  // ===WCAG CONTRAST CALCULATION ===
  const getLuminance=(r,g,b)=>{
    const [rs,gs,bs]=[r,g,b].map(x=>{x=x/255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);});
    return 0.2126*rs+0.7152*gs+0.0722*bs;
  };
  const getContrastRatio=(rgb1,rgb2)=>{
    const l1=getLuminance(rgb1.r,rgb1.g,rgb1.b),l2=getLuminance(rgb2.r,rgb2.g,rgb2.b);
    const lighter=Math.max(l1,l2),darker=Math.min(l1,l2);
    return((lighter+0.05)/(darker+0.05)).toFixed(2);
  };
  const getWcagStatus=(ratio)=>{
    const r=parseFloat(ratio);
    if(r>=7)return{status:'AAA Pass',color:'#2ecc71',level:'AAA'};
    if(r>=4.5)return{status:'AA Pass',color:'#2ecc71',level:'AA'};
    return{status:'Fail',color:'#e74c3c',level:'Fail'};
  };
  
  // === COLOR WHEEL CANVAS ===
  const drawColorWheel=(canvasId)=>{
    const canvas=document.getElementById(canvasId);
    if(!canvas)return;
    const ctx=canvas.getContext('2d');
    const w=canvas.width,h=canvas.height,cx=w/2,cy=h/2,radius=Math.min(w,h)/2-2;
    ctx.clearRect(0,0,w,h);
    
    for(let angle=0;angle<360;angle+=1){
      const hue=angle;
      const rgb=hsvToRgb(hue,100,100);
      const hex=rgbToHex(rgb.r,rgb.g,rgb.b);
      
      const rad=(angle-90)*(Math.PI/180);
      const x1=cx+Math.cos(rad)*radius*0.85;
      const y1=cy+Math.sin(rad)*radius*0.85;
      const x2=cx+Math.cos(rad)*radius;
      const y2=cy+Math.sin(rad)*radius;
      
      ctx.strokeStyle=hex;
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(x1,y1);
      ctx.lineTo(x2,y2);
      ctx.stroke();
    }
    
    // Center white circle
    ctx.fillStyle='#fff';
    ctx.beginPath();
    ctx.arc(cx,cy,radius*0.25,0,Math.PI*2);
    ctx.fill();
    
    // Center text
    ctx.fillStyle='#000';
    ctx.font='bold 14px Arial';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText('COLOR',cx,cy-8);
    ctx.fillText('WHEEL',cx,cy+10);
  };
  
  // === HARMONY GENERATION ===
  const generateHarmonies=(h)=>{
    return{
      monochromatic:[h],
      analogous:[h,(h+30)%360,(h+330)%360],
      complementary:[h,(h+180)%360],
      splitComplementary:[h,(h+150)%360,(h+210)%360],
      triadic:[h,(h+120)%360,(h+240)%360],
      tetradic:[h,(h+90)%360,(h+180)%360,(h+270)%360]
    };
  };
  
  const updateModalHarmonies=(currentRgb)=>{
    const hsv=rgbToHsv(currentRgb.r,currentRgb.g,currentRgb.b);
    const harmonies=generateHarmonies(hsv.h);
    
    const updateHarmonySection=(elementId,hueArray)=>{
      const container=document.getElementById(elementId);
      if(!container)return;
      container.innerHTML='';
      hueArray.forEach(hue=>{
        const rgb=hsvToRgb(hue,hsv.s,hsv.v);
        const hex=rgbToHex(rgb.r,rgb.g,rgb.b);
        const swatch=document.createElement('div');
        swatch.className='cs-harmony-swatch';
        swatch.style.background=hex;
        swatch.title=hex;
        swatch.onclick=(e)=>{
          updateCurrentColor(rgb);
        };
        container.appendChild(swatch);
      });
    };
    
    updateHarmonySection('monochromaticHarmony',harmonies.monochromatic);
    updateHarmonySection('analogousHarmony',harmonies.analogous);
    updateHarmonySection('complementaryHarmony',harmonies.complementary);
    updateHarmonySection('splitComplementaryHarmony',harmonies.splitComplementary);
    updateHarmonySection('triadicHarmony',harmonies.triadic);
    updateHarmonySection('tetradicHarmony',harmonies.tetradic);
  };
  
  // === CONTRAST CHECKER ===
  const updateContrastDisplay=(currentRgb)=>{
    const contrastBg={r:0,g:0,b:0};
    const ratio=getContrastRatio(currentRgb,contrastBg);
    const status=getWcagStatus(ratio);
    const csRatio=document.getElementById('csContrastRatio');
    const csStatus=document.getElementById('csContrastStatus');
    if(csRatio){csRatio.textContent=ratio+':1';}
    if(csStatus){csStatus.textContent=status.status;csStatus.style.color=status.color;}
  };
  
  // === MODAL MANAGEMENT ===
  let currentColor={r:255,g:0,b:0};
  
  const updateCurrentColor=(rgb)=>{
    currentColor=rgb;
    const hex=rgbToHex(rgb.r,rgb.g,rgb.b);
    // Update quick preview in sidebar
    document.getElementById('quickColorPreview').style.background=hex;
    document.getElementById('quickHexInput').value=hex;
    // Update modal harmonies and contrast display
    updateModalHarmonies(currentColor);
    updateContrastDisplay(currentColor);
  };
  
  const openColorScienceModal=()=>{
    const modal=document.getElementById('colorScienceModal');
    if(modal){
      modal.style.display='flex';
      modal.classList.add('active');
      drawColorWheel('colorWheelCanvas');
      
      // Update harmonies first (which creates swatches with handlers)
      updateModalHarmonies(currentColor);
      
      // Add onclick handlers to medium swatches (these are static in HTML)
      document.querySelectorAll('.cs-swatch').forEach(swatch=>{
        swatch.onclick=(e)=>{
          const bgColor=window.getComputedStyle(swatch).backgroundColor;
          const rgb=colorToRgb(bgColor);
          if(rgb)updateCurrentColor(rgb);
        };
      });
      
      // Add click tocolor wheel
      const colorWheelCanvas=document.getElementById('colorWheelCanvas');
      if(colorWheelCanvas){
        colorWheelCanvas.onclick=(e)=>{
          const rect=colorWheelCanvas.getBoundingClientRect();
          const x=e.clientX-rect.left-colorWheelCanvas.width/2;
          const y=e.clientY-rect.top-colorWheelCanvas.height/2;
          const angle=Math.atan2(y,x)*180/Math.PI+90;
          const hue=(angle%360+360)%360;
          const rgb=hsvToRgb(hue,100,100);
          updateCurrentColor(rgb);
        };
      }
      
      updateContrastDisplay(currentColor);
    }
  };
  
  // Helper to convert rgb/rgba string to rgb object
  const colorToRgb=(colorStr)=>{
    if(colorStr.startsWith('#')){
      return hexToRgb(colorStr);
    }
    const match=colorStr.match(/\d+/g);
    if(match && match.length>=3){
      return{r:parseInt(match[0]),g:parseInt(match[1]),b:parseInt(match[2])};
    }
    return null;
  };
  
  const closeColorScienceModal=()=>{
    const modal=document.getElementById('colorScienceModal');
    if(modal){
      modal.style.display='none';
      modal.classList.remove('active');
    }
  };
  
  // Modal event listeners
  document.getElementById('openColorScienceModalBtn').onclick=openColorScienceModal;
  document.getElementById('colorScienceCloseBtn').onclick=closeColorScienceModal;
  document.getElementById('colorScienceCancelBtn').onclick=closeColorScienceModal;
  document.getElementById('colorScienceOkBtn').onclick=()=>{
    const hex=rgbToHex(currentColor.r,currentColor.g,currentColor.b);
    // Update global color variable
    color=hex;
    // Update tool-specific color inputs if they exist
    if(document.getElementById('pencilColor'))document.getElementById('pencilColor').value=hex;
    if(document.getElementById('brushColor'))document.getElementById('brushColor').value=hex;
    if(document.getElementById('pencilHex'))document.getElementById('pencilHex').value=hex;
    if(document.getElementById('brushHex'))document.getElementById('brushHex').value=hex;
    console.log('✓ Color applied:',hex,'for tool:',tool);
    closeColorScienceModal();
  };
  
  // Close on modal background click
  document.getElementById('colorScienceModal').addEventListener('click',(e)=>{
    if(e.target.id==='colorScienceModal')closeColorScienceModal();
  });
  
  // Action buttons
  document.getElementById('colorScienceGuideBtn').onclick=()=>{
    alert('COLOR SCIENCE GUIDE\n\n=== HUE ===\nThe pure color name (red, blue, green, etc.)\n\n=== SATURATION/INTENSITY ===\nHow pure/vibrant the color is (0%=gray, 100%=pure)\n\n=== VALUE/LIGHTNESS ===\nHow bright the color is (0%=black, 100%=white)\n\n=== HARMONIES ===\n• Monochromatic: One color with tints/shades\n• Analogous: Adjacent colors (±30°)\n• Complementary: Opposite colors (180°)\n• Split Complementary: One hue + 2 neighbors\n• Triadic: 3 colors evenly spaced (120°)\n• Tetradic: 4 colors in square (90°)\n\n=== WCAG CONTRAST ===\nMeasures readability between two colors.\nAAA ≥ 7:1 (Enhanced)\nAA ≥ 4.5:1 (Standard)\nBelow 4.5:1 is hard to read.');
  };
  
  document.getElementById('colorScienceSafeColorsBtn').onclick=()=>{
    alert('SAFE COLORS\n\nWeb-safe colors are:\n• Supported by all browsers\n• Use hex values like #000000, #333333, #666666, etc.\n• Grayscale palette for universal compatibility\n• Modern browsers support all 16.7M colors\n\nFor accessibility:\n• Use sufficient contrast (WCAG AA/AAA)\n• Test with color blindness simulators\n• Don\'t rely on color alone for info');
  };
  
  document.getElementById('colorScienceAccessibilityBtn').onclick=()=>{
    alert('ACCESSIBILITY TOOLS\n\n=== COLOR BLINDNESS ===\nAbout 8% of males, 0.5% of females have color vision deficiency\n\n=== CONTRAST RATIO ===\nCalculated using WCAG 2.0 formula\nLighter luminance + 0.05 / Darker luminance + 0.05\n\n=== WCAG LEVELS ===\nAAA: Highest contrast (7:1+)\nAA: Standard (4.5:1+)\nFail: Less than 4.5:1\n\nTip: Test your colors with real users!');
  };
  
  // Quick colors in sidebar
  const quickUpdateColor=(hex)=>{
    const rgb=hexToRgb(hex);
    if(rgb){
      currentColor=rgb;
      document.getElementById('quickColorPreview').style.background=hex;
      document.getElementById('colorInput').value=hex;
      color=hex;
    }
  };
  
  document.getElementById('quickHexInput').oninput=(e)=>{
    const hex=e.target.value;
    if(/^#[0-9A-F]{6}$/i.test(hex)){
      quickUpdateColor(hex);
    }
  };
  
  document.getElementById('quickComplementaryBtn').onclick=()=>{
    const hsv=rgbToHsv(currentColor.r,currentColor.g,currentColor.b);
    const compHue=(hsv.h+180)%360;
    const rgb=hsvToRgb(compHue,hsv.s,hsv.v);
    quickUpdateColor(rgbToHex(rgb.r,rgb.g,rgb.b));
  };
  
  document.getElementById('quickAnalogousBtn').onclick=()=>{
    const hsv=rgbToHsv(currentColor.r,currentColor.g,currentColor.b);
    const analogHue=(hsv.h+30)%360;
    const rgb=hsvToRgb(analogHue,hsv.s,hsv.v);
    quickUpdateColor(rgbToHex(rgb.r,rgb.g,rgb.b));
  };
  
  document.getElementById('quickTriadicBtn').onclick=()=>{
    const hsv=rgbToHsv(currentColor.r,currentColor.g,currentColor.b);
    const triadHue=(hsv.h+120)%360;
    const rgb=hsvToRgb(triadHue,hsv.s,hsv.v);
    quickUpdateColor(rgbToHex(rgb.r,rgb.g,rgb.b));
  };
  
  document.getElementById('quickTetradicBtn').onclick=()=>{
    const hsv=rgbToHsv(currentColor.r,currentColor.g,currentColor.b);
    const tetHue=(hsv.h+90)%360;
    const rgb=hsvToRgb(tetHue,hsv.s,hsv.v);
    quickUpdateColor(rgbToHex(rgb.r,rgb.g,rgb.b));
  };
  
  // Sidebar color science handler
  document.getElementById('colorScienceOptions').onclick=()=>{
    const colorSciencePanel=document.querySelector('.color-science-panel-section .panel-body');
    if(colorSciencePanel){
      colorSciencePanel.style.display=colorSciencePanel.style.display==='none'?'block':'none';
    }
  };
}

// Sidebar color science handler
document.getElementById('colorScienceOptions').onclick=()=>{
  const colorSciencePanel=document.querySelector('.color-science-panel-section .panel-body');
  if(colorSciencePanel){
    colorSciencePanel.style.display=colorSciencePanel.style.display==='none'?'block':'none';
  }
};

// Sidebar image analysis handler
document.getElementById('imageAnalysisOptions').onclick=()=>{
  const imageAnalysisPanel=document.querySelector('.image-analysis-panel-section .panel-body');
  if(imageAnalysisPanel){
    imageAnalysisPanel.style.display=imageAnalysisPanel.style.display==='none'?'block':'none';
  }
};

// HELP MENU
document.getElementById('howToUseBtn').onclick=()=>{alert('HOW TO USE\n\n1. Select a tool from left panel or use keyboard shortcuts\n2. Choose color using the color wheel or hex input\n3. Draw on the canvas\n4. Use File→Export to save your drawing\n5. Use Grid Controls for alignment\n6. Use Selection tool to select and move areas\n7. Use shapes, text, and other tools for creative work\n\nFor more shortcuts, see Help → Shortcuts');};
document.getElementById('shortcutsBtn').onclick=()=>{alert('KEYBOARD SHORTCUTS\n\n=== TOOL SELECTION ===\nP - Pencil Tool\nB - Brush Tool\nE - Eraser Tool\nV - Selection Tool\nS - Shapes Tool\nT - Text Tool\nC - Color Picker\n\n=== EDITING ===\nCtrl+Z - Undo\nCtrl+Y / Ctrl+Shift+Z - Redo\nCtrl+C - Copy Selection\nCtrl+V - Paste\nCtrl+X - Cut\nDelete / Backspace - Delete Selection\n\n=== FILE ===\nCtrl+S - Save\nCtrl+E - Export');};
document.getElementById('aboutBtn').onclick=()=>{alert('Drawing Assistant v1.0\n\nA web-based digital drawing workspace with professional tools for sketching, painting, and creative work.\n\nFeatures:\n• Advanced color wheel with gradients\n• Multiple drawing tools (pencil, brush, eraser)\n• Shape creation and text tools\n• Selection and transformation\n• Full keyboard shortcuts\n• Undo/Redo history\n• Grid and zoom controls\n\n© 2026 Drawing Assistant');};

// DROPDOWN MENU HANDLERS - Smart dropdown behavior
let activeMenuBtn = null; // Track which menu is clicked

document.querySelectorAll('.menu-item').forEach(item=>{
  const btn=item.querySelector('.menu-btn');
  const dropdown=item.querySelector('.dropdown');
  
  if(btn&&dropdown){
    // Click button to toggle/open dropdown
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      
      if(activeMenuBtn===btn){
        // Clicking same button closes it
        dropdown.classList.remove('active');
        btn.classList.remove('active');
        activeMenuBtn=null;
      }else{
        // Close all other dropdowns
        document.querySelectorAll('.dropdown').forEach(d=>d.classList.remove('active'));
        document.querySelectorAll('.menu-btn').forEach(b=>b.classList.remove('active'));
        
        // Open this dropdown
        dropdown.classList.add('active');
        btn.classList.add('active');
        activeMenuBtn=btn;
      }
    });
    
    // Hover to show menu if another menu is already open
    item.addEventListener('mouseenter',()=>{
      if(activeMenuBtn!==null && activeMenuBtn!==btn){
        // Close all
        document.querySelectorAll('.dropdown').forEach(d=>d.classList.remove('active'));
        document.querySelectorAll('.menu-btn').forEach(b=>b.classList.remove('active'));
        
        // Show this one
        dropdown.classList.add('active');
        btn.classList.add('active');
        activeMenuBtn=btn;
      }
    });
  }
});

// Close dropdowns when clicking outside menus
document.addEventListener('click',e=>{
  if(!e.target.closest('.menu-item')&&!e.target.closest('.top-menu')){
    document.querySelectorAll('.dropdown').forEach(d=>d.classList.remove('active'));
    document.querySelectorAll('.menu-btn').forEach(b=>b.classList.remove('active'));
    activeMenuBtn=null;
  }
});

// Close dropdown when clicking a menu option
document.querySelectorAll('.dropdown button').forEach(btn=>{
  btn.addEventListener('click',e=>{
    e.stopPropagation();
    // Close dropdown after selection
    setTimeout(()=>{
      document.querySelectorAll('.dropdown').forEach(d=>d.classList.remove('active'));
      document.querySelectorAll('.menu-btn').forEach(b=>b.classList.remove('active'));
      activeMenuBtn=null;
    },100);
  });
});

// Keyboard Shortcuts
function selectTool(toolName) {
  tool = toolName;
  document.querySelectorAll('.tool-icons button').forEach(b => b.classList.remove('active'));
  const matchBtn = document.querySelector(`[data-tool="${tool}"]`);
  if (matchBtn) matchBtn.classList.add('active');
  document.getElementById('activeTool').textContent = `Tool: ${tool}`;
  if (tool === 'eraser') {
    drawCanvas.classList.add('eraser-cursor');
  } else {
    drawCanvas.classList.remove('eraser-cursor');
  }
  renderToolOptions(tool);
}

document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case 'z':
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        e.preventDefault();
        break;
      case 'y':
        redo();
        e.preventDefault();
        break;
      case 'a':
        // Select all - could implement if needed
        e.preventDefault();
        break;
      case 'c':
        if (selectionActive) {
          // Copy selection to clipboard (simplified - just store in variable)
          navigator.clipboard.writeText(JSON.stringify({data: selectionData, bounds: selectionBounds}));
        }
        e.preventDefault();
        break;
      case 'v':
        // Paste - would need to read from clipboard
        navigator.clipboard.readText().then(text => {
          try {
            const clip = JSON.parse(text);
            if (clip.data && clip.bounds) {
              selectionData = clip.data;
              selectionBounds = clip.bounds;
              selectionActive = true;
              drawSelectionOutline();
            }
          } catch (err) {}
        });
        e.preventDefault();
        break;
      case 'x':
        if (selectionActive) {
          // Cut - copy and clear
          navigator.clipboard.writeText(JSON.stringify({data: selectionData, bounds: selectionBounds}));
          ctx.clearRect(selectionBounds.x, selectionBounds.y, selectionBounds.width, selectionBounds.height);
          selectionActive = false;
          selectionData = null;
          selectionBounds = null;
          saveHistory();
        }
        e.preventDefault();
        break;
    }
  } else {
    switch (e.key.toLowerCase()) {
      case 'p':
        selectTool('pencil');
        e.preventDefault();
        break;
      case 'b':
        selectTool('brush');
        e.preventDefault();
        break;
      case 'e':
        selectTool('eraser');
        e.preventDefault();
        break;
      case 'v':
        selectTool('select');
        e.preventDefault();
        break;
      case 's':
        selectTool('shapes');
        e.preventDefault();
        break;
      case 't':
        selectTool('text');
        e.preventDefault();
        break;
      case 'c':
        selectTool('color');
        e.preventDefault();
        break;
      case 'delete':
      case 'backspace':
        if (selectionActive) {
          ctx.clearRect(selectionBounds.x, selectionBounds.y, selectionBounds.width, selectionBounds.height);
          selectionActive = false;
          selectionData = null;
          selectionBounds = null;
          saveHistory();
        }
        e.preventDefault();
        break;
    }
  }
});

// === IMAGE-BASED COLOR ANALYSIS ===
function initImageAnalysisPanel(){
  let extractedColors=[];
  let selectedImageData=null;
  let currentMood='neutral';
  
  const hexToRgb=(hex)=>{
    const result=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result?{r:parseInt(result[1],16),g:parseInt(result[2],16),b:parseInt(result[3],16)}:null;
  };
  
  const rgbToHex=(r,g,b)=>{
    return"#"+[r,g,b].map(x=>{const hex=x.toString(16);return hex.length===1?"0"+hex:hex;}).join('').toUpperCase();
  };
  
  const rgbToHsv=(r,g,b)=>{
    r/=255;g/=255;b/=255;
    const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
    let h=0;
    if(d!==0){
      if(max===r)h=((g-b)/d+(g<b?6:0))/6;
      else if(max===g)h=((b-r)/d+2)/6;
      else h=((r-g)/d+4)/6;
    }
    return{h:Math.round(h*360),s:Math.round((max===0?0:d/max)*100),v:Math.round(max*100)};
  };
  
  const hsvToRgb=(h,s,v)=>{
    h=h/360;s=s/100;v=v/100;
    const c=v*s,x=c*(1-Math.abs((h*6)%2-1)),m=v-c;
    let r,g,b;
    if(h<1/6){r=c;g=x;b=0;}
    else if(h<1/3){r=x;g=c;b=0;}
    else if(h<1/2){r=0;g=c;b=x;}
    else if(h<2/3){r=0;g=x;b=c;}
    else if(h<5/6){r=x;g=0;b=c;}
    else{r=c;g=0;b=x;}
    return{r:Math.round((r+m)*255),g:Math.round((g+m)*255),b:Math.round((b+m)*255)};
  };
  
  const getLuminance=(r,g,b)=>{
    const [rs,gs,bs]=[r,g,b].map(x=>{x=x/255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);});
    return 0.2126*rs+0.7152*gs+0.0722*bs;
  };
  
  const getContrastRatio=(rgb1,rgb2)=>{
    const l1=getLuminance(rgb1.r,rgb1.g,rgb1.b),l2=getLuminance(rgb2.r,rgb2.g,rgb2.b);
    const lighter=Math.max(l1,l2),darker=Math.min(l1,l2);
    return((lighter+0.05)/(darker+0.05)).toFixed(2);
  };
  
  // Color extraction using simple histogram clustering
  const extractColors=(imageData,numColors=8)=>{
    const data=imageData.data;
    const colors=[];
    const step=Math.floor(data.length/1000);
    
    for(let i=0;i<data.length;i+=step*4){
      colors.push({
        r:data[i],
        g:data[i+1],
        b:data[i+2],
        count:1
      });
    }
    
    // Sort by brightness
    colors.sort((a,b)=>{
      const lumA=getLuminance(a.r,a.g,a.b);
      const lumB=getLuminance(b.r,b.g,b.b);
      return lumB-lumA;
    });
    
    // Return top unique colors
    const unique=[];
    colors.forEach(c=>{
      const isDuplicate=unique.some(u=>Math.abs(u.r-c.r)<30&&Math.abs(u.g-c.g)<30&&Math.abs(u.b-c.b)<30);
      if(!isDuplicate&&unique.length<numColors){
        unique.push(c);
      }
    });
    
    return unique;
  };
  
  // Detect mood/tone from image colors
  const analyzeMood=(colors)=>{
    let warmCount=0,coolCount=0,brightCount=0,darkCount=0;
    
    colors.forEach(c=>{
      const hsv=rgbToHsv(c.r,c.g,c.b);
      if((hsv.h>=0&&hsv.h<60)||(hsv.h>=330&&hsv.h<=360)){warmCount++;}
      if(hsv.h>=180&&hsv.h<270){coolCount++;}
      if(hsv.v>=70){brightCount++;}
      if(hsv.v<30){darkCount++;}
    });
    
    const moods=[
      {count:warmCount,tags:['warm','energetic'],name:'warm'},
      {count:coolCount,tags:['cool','calm'],name:'cool'},
      {count:brightCount,tags:['vibrant','bright'],name:'vibrant'},
      {count:darkCount,tags:['moody','deep'],name:'dark'}
    ];
    
    const sorted=moods.sort((a,b)=>b.count-a.count);
    return{mood:sorted[0].name,tags:sorted.slice(0,2).flatMap(m=>m.tags)};
  };
  
  // Generate harmony from extracted color
  const generateHarmonyFromColor=(rgb,harmonyType)=>{
    const hsv=rgbToHsv(rgb.r,rgb.g,rgb.b);
    let hues=[hsv.h];
    
    if(harmonyType==='monochromatic'){
      // Variations of same hue
      hues=[hsv.h];
    } else if(harmonyType==='analogous'){
      hues=[hsv.h,(hsv.h+30)%360,(hsv.h+330)%360];
    } else if(harmonyType==='complementary'){
      hues=[hsv.h,(hsv.h+180)%360];
    } else if(harmonyType==='triadic'){
      hues=[hsv.h,(hsv.h+120)%360,(hsv.h+240)%360];
    }
    
    return hues.map(h=>hsvToRgb(h,hsv.s,hsv.v));
  };
  
  // Display extracted colors
  const displayColors=(colors)=>{
    const grid=document.getElementById('dominantColorsGrid');
    grid.innerHTML='';
    
    extractedColors=colors;
    colors.forEach((c,i)=>{
      const hex=rgbToHex(c.r,c.g,c.b);
      const hsv=rgbToHsv(c.r,c.g,c.b);
      
      const swatch=document.createElement('div');
      swatch.className='color-swatch-item';
      swatch.style.background=hex;
      swatch.innerHTML=`
        <div class="color-swatch-preview"></div>
        <div class="color-swatch-info">
          <div class="color-swatch-hex">${hex}</div>
          <div class="color-swatch-tag">RGB(${c.r},${c.g},${c.b})</div>
        </div>
      `;
      swatch.onclick=()=>{
        color=hex;
        document.getElementById('quickColorPreview').style.background=hex;
        document.getElementById('quickHexInput').value=hex;
      };
      grid.appendChild(swatch);
    });
    
    // Show mood
    const moodAnalysis=analyzeMood(colors);
    currentMood=moodAnalysis.mood;
    const moodLabel=document.querySelector('.img-mood-section');
    if(moodLabel){moodLabel.style.display='block';}
    
    document.getElementById('moodLabel').textContent=`Mood: ${moodAnalysis.mood.toUpperCase()}`;
    const tagsDiv=document.getElementById('moodTags');
    tagsDiv.innerHTML=moodAnalysis.tags.map(tag=>`<span class="mood-tag ${tag}">${tag}</span>`).join('');
    
    // Show harmony section
    document.querySelector('.img-harmony-section').style.display='block';
    document.querySelector('.img-medium-section').style.display='block';
    document.querySelector('.img-contrast-section').style.display='block';
  };
  
  // Handle image import
  const handleImageImport=(file)=>{
    const reader=new FileReader();
    reader.onload=(e)=>{
      const img=new Image();
      img.onload=()=>{
        document.getElementById('previewImg').src=img.src;
        document.getElementById('importedImagePreview').style.display='block';
        
        const canvas=document.createElement('canvas');
        canvas.width=img.width;
        canvas.height=img.height;
        const ctx=canvas.getContext('2d');
        ctx.drawImage(img,0,0);
        selectedImageData=ctx.getImageData(0,0,img.width,img.height);
        
        const colors=extractColors(selectedImageData,8);
        displayColors(colors);
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  };
  
  // Drag and drop
  const dragZone=document.getElementById('dragDropZone');
  dragZone.addEventListener('dragover',(e)=>{
    e.preventDefault();
    dragZone.classList.add('dragover');
  });
  dragZone.addEventListener('dragleave',()=>{
    dragZone.classList.remove('dragover');
  });
  dragZone.addEventListener('drop',(e)=>{
    e.preventDefault();
    dragZone.classList.remove('dragover');
    const files=e.dataTransfer.files;
    if(files.length>0){handleImageImport(files[0]);}
  });
  
  // File input
  document.getElementById('browseImageBtn').onclick=()=>{
    document.getElementById('imageFileInput').click();
  };
  document.getElementById('imageFileInput').onchange=(e)=>{
    if(e.target.files.length>0){
      handleImageImport(e.target.files[0]);
    }
  };
  
  // Harmony buttons
  document.getElementById('imgMono').onclick=()=>{
    if(extractedColors.length===0)return;
    const harmonies=generateHarmonyFromColor(extractedColors[0],'monochromatic');
    displayHarmonies(harmonies);
  };
  document.getElementById('imgAnalog').onclick=()=>{
    if(extractedColors.length===0)return;
    const harmonies=generateHarmonyFromColor(extractedColors[0],'analogous');
    displayHarmonies(harmonies);
  };
  document.getElementById('imgComp').onclick=()=>{
    if(extractedColors.length===0)return;
    const harmonies=generateHarmonyFromColor(extractedColors[0],'complementary');
    displayHarmonies(harmonies);
  };
  document.getElementById('imgTriad').onclick=()=>{
    if(extractedColors.length===0)return;
    const harmonies=generateHarmonyFromColor(extractedColors[0],'triadic');
    displayHarmonies(harmonies);
  };
  
  const displayHarmonies=(colors)=>{
    const grid=document.getElementById('harmonyPaletteGrid');
    grid.innerHTML='';
    colors.forEach(c=>{
      const hex=rgbToHex(c.r,c.g,c.b);
      const swatch=document.createElement('div');
      swatch.className='harmony-swatch-mini';
      swatch.style.background=hex;
      swatch.title=hex;
      swatch.onclick=()=>{
        color=hex;
        document.getElementById('quickColorPreview').style.background=hex;
        document.getElementById('quickHexInput').value=hex;
      };
      grid.appendChild(swatch);
    });
  };
  
  // Medium preview simulation
  const simulateMedium=(mediumType)=>{
    if(extractedColors.length===0)return;
    const canvas=document.getElementById('mediumPreviewCanvas');
    const ctx=canvas.getContext('2d');
    const w=canvas.width,h=canvas.height;
    
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#fff';
    ctx.fillRect(0,0,w,h);
    
    extractedColors.slice(0,5).forEach((c,i)=>{
      const hex=rgbToHex(c.r,c.g,c.b);
      const x=(i%5)*(w/5);
      const y=Math.floor(i/5)*(h/2);
      
      if(mediumType==='watercolor'){
        ctx.globalAlpha=0.5;
        ctx.fillStyle=hex;
        ctx.fillRect(x,y,w/5,h/2);
      } else if(mediumType==='crayon'){
        ctx.globalAlpha=0.8;
        ctx.fillStyle=hex;
        ctx.fillRect(x,y,w/5,h/2);
        ctx.strokeStyle='rgba(0,0,0,.2)';
        ctx.lineWidth=1;
        ctx.strokeRect(x,y,w/5,h/2);
      } else if(mediumType==='pencil'){
        ctx.globalAlpha=0.6;
        ctx.fillStyle=hex;
        for(let j=0;j<5;j++){
          ctx.fillRect(x+Math.random()*2,y+j*(h/10),w/5-2,1);
        }
      } else if(mediumType==='paint'){
        ctx.globalAlpha=1;
        ctx.fillStyle=hex;
        ctx.fillRect(x,y,w/5,h/2);
      }
    });
    ctx.globalAlpha=1;
  };
  
  document.getElementById('medWatercolor').onclick=()=>simulateMedium('watercolor');
  document.getElementById('medCrayon').onclick=()=>simulateMedium('crayon');
  document.getElementById('medPencil').onclick=()=>simulateMedium('pencil');
  document.getElementById('medPaint').onclick=()=>simulateMedium('paint');
  
  // Contrast checker
  const checkContrasts=()=>{
    const results=document.getElementById('contrastResults');
    results.innerHTML='';
    
    for(let i=0;i<Math.min(extractedColors.length,3);i++){
      for(let j=i+1;j<Math.min(extractedColors.length,3);j++){
        const ratio=getContrastRatio(extractedColors[i],extractedColors[j]);
        const pass=ratio>=4.5;
        const hex1=rgbToHex(extractedColors[i].r,extractedColors[i].g,extractedColors[i].b);
        const hex2=rgbToHex(extractedColors[j].r,extractedColors[j].g,extractedColors[j].b);
        results.innerHTML+=`<div class="${pass?'contrast-pass':'contrast-fail'}">${hex1} + ${hex2}: ${ratio}:1</div>`;
      }
    }
  };
  
  // Export palette
  document.getElementById('exportPaletteBtn').onclick=()=>{
    const paletteData={
      colors:extractedColors.map(c=>rgbToHex(c.r,c.g,c.b)),
      mood:currentMood,
      timestamp:new Date().toISOString()
    };
    const json=JSON.stringify(paletteData,null,2);
    const blob=new Blob([json],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`palette-${Date.now()}.json`;
    a.click();
  };
  
  // Apply palette to drawing
  document.getElementById('applyPaletteBtn').onclick=()=>{
    if(extractedColors.length===0)return;
    color=rgbToHex(extractedColors[0].r,extractedColors[0].g,extractedColors[0].b);
    document.getElementById('quickColorPreview').style.background=color;
    document.getElementById('quickHexInput').value=color;
    alert('Palette colors applied! Start with color: '+color);
  };
  
  // Image analysis sidebar toggle
  document.querySelector('button[data-tool="image"]')?.addEventListener('click',()=>{
    checkContrasts();
  });
}

// Initialize Background Suggestion Panel
function initBackgroundSuggestionsPanel(){
  let currentMood='calm';
  let extractedBgColors=[];
  let currentBgSuggestionIndex=0;
  let currentBgSuggestion=null;
  let bgPresets=JSON.parse(localStorage.getItem('bgPresets')||'[]');
  
  // Color utility functions (reuse from Color Science)
  const hexToRgb=(hex)=>{const result=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);return result?{r:parseInt(result[1],16),g:parseInt(result[2],16),b:parseInt(result[3],16)}:null;};
  const rgbToHex=(r,g,b)=>'#'+[r,g,b].map(x=>{const hex=x.toString(16);return hex.length===1?'0'+hex:hex;}).join('').toUpperCase();
  const rgbToHsv=(r,g,b)=>{r/=255;g/=255;b/=255;const max=Math.max(r,g,b);const min=Math.min(r,g,b);let h=0;const s=(max===0)?0:(1-(min/max));const v=max;if(max!==min){const c=max-min;h=((max===r)?((g-b)/c%6):((max===g)?((b-r)/c+2):((r-g)/c+4)))*60;if(h<0)h+=360;}return{h,s:s*100,v:v*100};};
  const hsvToRgb=(h,s,v)=>{s/=100;v/=100;const c=v*s;const x=c*(1-Math.abs(((h/60)%2)-1));const m=v-c;let r=0,g=0,b=0;if(h<60){r=c;g=x;b=0;}else if(h<120){r=x;g=c;b=0;}else if(h<180){r=0;g=c;b=x;}else if(h<240){r=0;g=x;b=c;}else if(h<300){r=x;g=0;b=c;}else{r=c;g=0;b=x;}return{r:Math.round((r+m)*255),g:Math.round((g+m)*255),b:Math.round((b+m)*255)};};

  // Analyze image and extract mood
  const analyzeImageForMood=(imageData)=>{
    const data=imageData.data;
    let brightCount=0,darkCount=0,warmCount=0,coolCount=0,satCount=0,mutedCount=0;
    const colorSamples=[];
    
    for(let i=0;i<data.length;i+=16){
      const r=data[i],g=data[i+1],b=data[i+2];
      const hsv=rgbToHsv(r,g,b);
      const h=hsv.h,s=hsv.s,v=hsv.v;
      
      if(v>=70)brightCount++;
      if(v<30)darkCount++;
      if((h>=0&&h<=60)||(h>=330&&h<=360))warmCount++;
      if(h>=180&&h<=270)coolCount++;
      if(s>=60)satCount++;
      if(s<40)mutedCount++;
      
      colorSamples.push({r,g,b,h,s,v});
    }
    
    const total=colorSamples.length;
    const brightness=(brightCount/total)*100;
    const darkness=(darkCount/total)*100;
    const warm=(warmCount/total)*100;
    const cool=(coolCount/total)*100;
    const saturated=(satCount/total)*100;
    const muted=(mutedCount/total)*100;
    
    // Determine primary mood
    let mood='neutral',tags=[];
    if(saturated>50&&brightCount>darkCount){mood='energetic';tags=['vibrant','playful','dynamic'];}
    else if(muted>50&&cool>warm){mood='calm';tags=['serene','peaceful','introspective'];}
    else if(darkCount>60){mood='dramatic';tags=['mysterious','moody','dramatic'];}
    else if(brightCount>70&&warmCount>coolCount){mood='warm';tags=['cozy','welcoming','cheerful'];}
    else if(coolCount>warmCount){mood='cool';tags=['cool','fresh','tranquil'];}
    else{mood='balanced';tags=['harmonious','balanced','neutral'];}
    
    extractedBgColors=colorSamples.slice(0,8);
    currentMood=mood;
    
    return{mood,tags,brightness,darkness,warm,cool,saturated,muted};
  };

  // Generate background suggestions based on mood
  const generateBackgroundSuggestions=(mood)=>{
    const suggestions={
      'calm':[
        {name:'Soft Gradient',desc:'Pastel blue to white gradient',type:'gradient',colors:['#E3F2FD','#F0F8FF'],style:'radial'},
        {name:'Watercolor Wash',desc:'Light blue watercolor texture',type:'texture',colors:['#B3E5FC'],style:'watercolor'},
        {name:'Misty Texture',desc:'Foggy, soft edges',type:'texture',colors:['#D1D5E0','#E8EAED'],style:'mist'},
        {name:'Soft Sunset',desc:'Warm pastels with cool blend',type:'gradient',colors:['#FFE5CC','#E1F5FF'],style:'linear'}
      ],
      'energetic':[
        {name:'Bold Geometric',desc:'Sharp angular shapes',type:'pattern',colors:['#FF6B35','#004E89','#FFFFFF'],style:'geometric'},
        {name:'Sunburst',desc:'Radiating color waves',type:'pattern',colors:['#FFD700','#FF6347'],style:'sunburst'},
        {name:'Vibrant Strokes',desc:'Dynamic brush strokes',type:'texture',colors:['#FF1493','#00BFFF'],style:'brushstroke'},
        {name:'Electric Grid',desc:'Neon lines pattern',type:'pattern',colors:['#00FF00','#FF00FF','#000000'],style:'grid'}
      ],
      'dramatic':[
        {name:'Dark Mystery',desc:'Deep shadows with accent',type:'gradient',colors:['#1A1A2E','#16213E'],style:'radial'},
        {name:'High Contrast',desc:'Bold black and white',type:'pattern',colors:['#000000','#FFFFFF'],style:'contrast'},
        {name:'Noir Marble',desc:'Dark stone texture',type:'texture',colors:['#2C2C2C','#1A1A1A'],style:'marble'},
        {name:'Smoke & Embers',desc:'Dark with subtle glow',type:'texture',colors:['#3D3D3D','#FF6B35'],style:'smoke'}
      ],
      'warm':[
        {name:'Sunset Gradient',desc:'Orange to pink fade',type:'gradient',colors:['#FF8C42','#FFA500','#FFB347'],style:'linear'},
        {name:'Autumn Leaves',desc:'Warm earthy tones',type:'texture',colors:['#CD853F','#DAA520','#BC8F8F'],style:'organic'},
        {name:'Clay Texture',desc:'Warm clay background',type:'texture',colors:['#C2893A','#D89B5E'],style:'clay'},
        {name:'Golden Hour',desc:'Golden warm glow',type:'gradient',colors:['#FFD700','#FFA500'],style:'radial'}
      ],
      'cool':[
        {name:'Ocean Gradient',desc:'Cyan to deep blue',type:'gradient',colors:['#00BCD4','#004E89'],style:'linear'},
        {name:'Ice Crystal',desc:'Cool crystalline pattern',type:'pattern',colors:['#87CEEB','#ADD8E6'],style:'crystal'},
        {name:'Midnight Sky',desc:'Deep cool blue',type:'texture',colors:['#0A1F4D','#1A3A6F'],style:'sky'},
        {name:'Frosted Glass',desc:'Cool blur effect',type:'texture',colors:['#B0E0E6','#87CEEB'],style:'frosted'}
      ],
      'dramatic':[
        {name:'Futuristic Grid',desc:'Neon tech pattern',type:'pattern',colors:['#00FF00','#FF00FF','#000000'],style:'cyberpunk'},
        {name:'Cosmic Space',desc:'Stars and nebula',type:'texture',colors:['#0A0A1A','#FF00FF'],style:'cosmic'},
        {name:'Matrix Rain',desc:'Digital code effect',type:'pattern',colors:['#00FF00','#000000'],style:'digital'},
        {name:'Quantum Field',desc:'Abstract particles',type:'pattern',colors:['#0080FF','#FF0080'],style:'particles'}
      ]
    };
    return suggestions[mood]||suggestions['calm'];
  };

  // Render background preview
  const renderBgPreview=(suggestion,canvas,colors)=>{
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    
    if(suggestion.style==='gradient'||suggestion.style==='radial'||suggestion.style==='linear'){
      let grad;
      if(suggestion.style==='radial'){
        grad=ctx.createRadialGradient(canvas.width/2,canvas.height/2,0,canvas.width/2,canvas.height/2,canvas.width);
      }else{
        grad=ctx.createLinearGradient(0,0,canvas.width,canvas.height);
      }
      suggestion.colors.forEach((color,i)=>{grad.addColorStop(i/(suggestion.colors.length-1),color);});
      ctx.fillStyle=grad;
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    
    if(suggestion.style==='pattern'||suggestion.style==='geometric'){
      const colors=suggestion.colors;
      const w=canvas.width/3,h=canvas.height/3;
      for(let i=0;i<3;i++){
        for(let j=0;j<3;j++){
          ctx.fillStyle=colors[(i+j)%colors.length];
          ctx.fillRect(i*w,j*h,w,h);
        }
      }
    }
    
    if(suggestion.style==='watercolor'){
      const c=suggestion.colors[0];
      ctx.fillStyle=c;ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle='rgba(255,255,255,0.3)';
      for(let i=0;i<10;i++){
        ctx.beginPath();ctx.arc(Math.random()*canvas.width,Math.random()*canvas.height,Math.random()*30,0,Math.PI*2);ctx.fill();
      }
    }
    
    if(suggestion.style==='texture'||suggestion.style==='marble'||suggestion.style==='clay'||suggestion.style==='mist'){
      ctx.fillStyle=suggestion.colors[0];ctx.fillRect(0,0,canvas.width,canvas.height);
      const imageData=ctx.getImageData(0,0,canvas.width,canvas.height);
      const data=imageData.data;
      for(let i=0;i<data.length;i+=4){
        const noise=Math.random()*30;
        data[i]+=noise;data[i+1]+=noise;data[i+2]+=noise;
      }
      ctx.putImageData(imageData,0,0);
    }
    
    if(suggestion.style==='brushstroke'){
      ctx.fillStyle=suggestion.colors[0];ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.strokeStyle=suggestion.colors[1];ctx.lineWidth=8;ctx.globalAlpha=0.5;
      for(let i=0;i<5;i++){
        ctx.beginPath();ctx.moveTo(0,Math.random()*canvas.height);ctx.quadraticCurveTo(canvas.width/2,Math.random()*canvas.height,canvas.width,Math.random()*canvas.height);ctx.stroke();
      }ctx.globalAlpha=1;
    }
    
    ctx.globalAlpha=0.7;
    if(colors.length>0){
      const cw=canvas.width/Math.min(colors.length,8);
      colors.slice(0,8).forEach((c,i)=>{ctx.fillStyle=`rgb(${c.r},${c.g},${c.b})`;ctx.fillRect(i*cw,canvas.height-20,cw,20);});
    }
    ctx.globalAlpha=1;
  };

  // Update carousel with suggestions
  const updateSuggestionsCarousel=(suggestions)=>{
    const carousel=document.getElementById('bgSuggestionsCarousel');
    carousel.innerHTML='';
    suggestions.forEach((s,i)=>{
      const card=document.createElement('div');
      card.className='bg-suggestion-card'+(i===0?' active':'');
      card.innerHTML=`<div class="bg-suggestion-preview"></div><div class="bg-suggestion-title">${s.name}</div><div class="bg-suggestion-desc">${s.desc}</div>`;
      card.onclick=()=>{
        document.querySelectorAll('.bg-suggestion-card').forEach(c=>c.classList.remove('active'));
        card.classList.add('active');
        currentBgSuggestionIndex=i;
        currentBgSuggestion=s;
        const previewCanvas=document.getElementById('bgPreviewCanvas');
        renderBgPreview(s,previewCanvas,extractedBgColors);
        updateHarmonyInfo(s,extractedBgColors);
      };
      carousel.appendChild(card);
      const prev=card.querySelector('.bg-suggestion-preview');
      renderBgPreview(s,Object.assign(document.createElement('canvas'),{width:200,height:80,getContext:function(){return prev.getContext('2d')}}),extractedBgColors);
    });
  };

  // Update harmony info
  const updateHarmonyInfo=(suggestion,colors)=>{
    if(colors.length===0)return;
    const harmonySection=document.querySelector('.bg-harmony-section');
    const c1=colors[0],c2=colors[Math.floor(colors.length/2)]||colors[0];
    const h1=`rgb(${c1.r},${c1.g},${c1.b})`,h2=`rgb(${c2.r},${c2.g},${c2.b})`;
    const lum1=0.2126*c1.r+0.7152*c1.g+0.0722*c1.b,lum2=0.2126*c2.r+0.7152*c2.g+0.0722*c2.b;
    const ratio=((Math.max(lum1,lum2)+0.05)/(Math.min(lum1,lum2)+0.05)).toFixed(2);
    document.getElementById('bgHarmonyInfo').innerHTML=`<strong>${suggestion.name}</strong> complements your image.<br>Contrast Ratio: ${ratio}:1 ${ratio>=4.5?'✓ AA Pass':'✗ Consider'}`;
  };

  // Import image for mood analysis
  document.getElementById('bgImportImageBtn').onclick=()=>{
    const input=document.createElement('input');
    input.type='file';input.accept='image/*';
    input.onchange=()=>{
      const file=input.files[0];
      const reader=new FileReader();
      reader.onload=e=>{
        const img=new Image();
        img.onload=()=>{
          const canvas=document.createElement('canvas');
          canvas.width=img.width;canvas.height=img.height;
          const ctx=canvas.getContext('2d');
          ctx.drawImage(img,0,0);
          const imageData=ctx.getImageData(0,0,canvas.width,canvas.height);
          
          const analysis=analyzeImageForMood(imageData);
          const moodSection=document.querySelector('.bg-mood-section');
          moodSection.style.display='block';
          document.getElementById('bgMoodTitle').textContent='📊 '+analysis.mood.charAt(0).toUpperCase()+analysis.mood.slice(1);
          const moods_desc={'calm':'Serene and peaceful','energetic':'Vibrant and dynamic','dramatic':'Bold and intense','warm':'Cozy and inviting','cool':'Fresh and tranquil','balanced':'Harmonious and neutral'};
          document.getElementById('bgMoodDescription').textContent=moods_desc[analysis.mood]||'Analyzing...';
          document.getElementById('bgMoodTags').innerHTML=analysis.tags.map(t=>`<div class="mood-tag">${t}</div>`).join('');
          
          const suggestions=generateBackgroundSuggestions(analysis.mood);
          document.querySelector('.bg-suggestions-section').style.display='block';
          document.querySelector('.bg-harmony-section').style.display='block';
          currentBgSuggestion=suggestions[0];
          updateSuggestionsCarousel(suggestions);
          
          const previewCanvas=document.getElementById('bgPreviewCanvas');
          renderBgPreview(suggestions[0],previewCanvas,extractedBgColors);
          updateHarmonyInfo(suggestions[0],extractedBgColors);
        };
        img.src=e.target.result;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  // Carousel navigation
  document.getElementById('bgCarouselNext').onclick=()=>{
    const cards=document.querySelectorAll('.bg-suggestion-card');
    const carousel=document.getElementById('bgSuggestionsCarousel');
    carousel.scrollLeft+=250;
  };
  document.getElementById('bgCarouselPrev').onclick=()=>{
    const carousel=document.getElementById('bgSuggestionsCarousel');
    carousel.scrollLeft-=250;
  };

  // Opacity slider
  document.getElementById('bgOpacitySlider').oninput=e=>{
    document.getElementById('bgOpacityValue').textContent=e.target.value+'%';
    const previewCanvas=document.getElementById('bgPreviewCanvas');
    if(currentBgSuggestion) renderBgPreview(currentBgSuggestion,previewCanvas,extractedBgColors);
  };

  // Apply to canvas
  document.getElementById('bgApplyBtn').onclick=()=>{
    if(!currentBgSuggestion){alert('Please select a background style first');return;}
    const opacity=parseInt(document.getElementById('bgOpacitySlider').value)/100;
    const previewCanvas=document.getElementById('bgPreviewCanvas');
    const bgImageData=previewCanvas.toDataURL('image/png');
    
    const bgLayer={
      canvas:document.createElement('canvas'),
      ctx:null,
      visible:true,
      opacity:opacity,
      blendMode:'multiply',
      name:'Background'
    };
    bgLayer.canvas.width=drawCanvas.width;
    bgLayer.canvas.height=drawCanvas.height;
    bgLayer.ctx=bgLayer.canvas.getContext('2d');
    
    const img=new Image();
    img.onload=()=>{
      bgLayer.ctx.drawImage(img,0,bgLayer.canvas.height-previewCanvas.height,bgLayer.canvas.width,Math.min(previewCanvas.height,bgLayer.canvas.height));
      layers.splice(activeLayerIndex,0,bgLayer);
      updateLayersList();
      renderLayers();
      saveHistory();
      alert('Background applied! You can adjust opacity and blending.');
    };
    img.src=bgImageData;
  };

  // Save preset
  document.getElementById('bgSavePresetBtn').onclick=()=>{
    if(!currentBgSuggestion){alert('Select a background first');return;}
    const presetName=prompt('Preset name:',currentBgSuggestion.name);
    if(!presetName)return;
    const preset={name:presetName,suggestion:currentBgSuggestion,colors:extractedBgColors,mood:currentMood};
    bgPresets.push(preset);
    localStorage.setItem('bgPresets',JSON.stringify(bgPresets));
    alert('Preset saved!');
  };

  // Sidebar toggle
  const bgPanel=document.querySelector('.background-suggestion-panel-section');
  const bgToggle=bgPanel?.querySelector('button.toggle');
  const bgBody=bgPanel?.querySelector('.panel-body');
  
  document.getElementById('backgroundSuggestionOptions')?.addEventListener('click',()=>{
    if(bgBody)bgBody.style.display=bgBody.style.display==='none'?'block':'none';
    if(bgToggle)bgToggle.textContent=bgBody?.style.display==='none'?'+':'−';
  });
  
  bgToggle?.addEventListener('click',e=>{
    e.stopPropagation();
    bgBody.style.display=bgBody.style.display==='none'?'block':'none';
    bgToggle.textContent=bgBody.style.display==='none'?'+':'−';
  });
}

// Initialize Avatar Panel
// Helper: Safe element getter with logging
const getAvatarElement=(id)=>{
  const el=document.getElementById(id);
  if(!el)console.warn(`Avatar element not found: ${id}`);
  return el;
};

const getOrQuerySelector=(selector)=>{
  const el=document.querySelector(selector);
  if(!el)console.warn(`Avatar selector not found: ${selector}`);
  return el;
};

function initAvatarPanel(){
  console.log('🎨 Initializing Avatar Panel...');
  
  // Verify required elements exist
  const requiredElements=['avatarOptions','avatarRandomize','avatarEyes','avatarNose','avatarMouth','avatarHeight','avatarBuild','avatarRotation','hairColorPicker','outfitColorPicker','skinTonePicker','avatarSavePreset','avatarExport','avatarApply','avatarReset','avatarResetRotation'];
  const missingElements=requiredElements.filter(id=>!document.getElementById(id));
  if(missingElements.length>0){
    console.error('❌ Missing avatar UI elements:',missingElements);
    return;
  }
  
  let avatarState={
    baseModel:'neutral',pose:'standing',expression:'smile',
    eyes:50,nose:50,mouth:50,
    hairstyle:'long',hairColor:'#FF8C42',
    accessories:[],
    height:50,build:50,outfit:'casual',outfitColor:'#5A90FF',
    skinTone:'#F4A460',theme:'warm',
    background:'none',rotation:0,
    layerStyle:'outline'
  };
  let avatarCanvas=null;
  let avatarPresets=[];
  try{
    avatarPresets=JSON.parse(localStorage.getItem('avatarPresets')||'[]');
    console.log(`✓ Loaded ${avatarPresets.length} avatar presets from storage`);
  }catch(e){
    console.warn('Could not load presets from storage',e);
    avatarPresets=[];
  }
  
  // Initialize avatar canvas with error handling
  const initAvatarCanvas=()=>{
    if(avatarCanvas)return; // Already initialized
    try{
      const container=document.querySelector('.avatar-base-section');
      if(!container){
        console.error('❌ Avatar base section container not found');
        return false;
      }
      
      avatarCanvas=document.createElement('canvas');
      avatarCanvas.id='avatarPreviewCanvas';
      avatarCanvas.width=300;
      avatarCanvas.height=400;
      avatarCanvas.style.cssText='border:2px solid var(--border);border-radius:8px;background:rgba(0,0,0,.2);margin:8px 0;display:block;width:100%;max-width:100%;cursor:crosshair;';
      
      // Verify 2D context
      const ctx=avatarCanvas.getContext('2d');
      if(!ctx){
        console.error('❌ Failed to get 2D context from avatar canvas');
        avatarCanvas=null;
        return false;
      }
      
      container.parentElement.insertBefore(avatarCanvas,container.nextSibling);
      console.log('✓ Avatar preview canvas initialized');
      return true;
    }catch(e){
      console.error('❌ Error initializing avatar canvas:',e);
      avatarCanvas=null;
      return false;
    }
  };
  
  // Draw avatar on canvas with error handling
  const drawAvatar=()=>{
    try{
      if(!initAvatarCanvas())return;
      
      const ctx=avatarCanvas.getContext('2d');
      if(!ctx){
        console.error('❌ Cannot get 2D context for drawing');
        return;
      }
      
      const w=avatarCanvas.width,h=avatarCanvas.height;
      
      // Clear canvas
      ctx.clearRect(0,0,w,h);
      
      // Background
      if(avatarState.background!=='none'){
        ctx.fillStyle=avatarState.background;
        ctx.fillRect(0,0,w,h);
      }
    if(avatarState.rotation!==0){
      ctx.save();
      ctx.translate(w/2,h/2);
      ctx.rotate(avatarState.rotation*Math.PI/180);
      ctx.translate(-w/2,-h/2);
    }
    
    // Body proportions
    const heightMult=0.5+avatarState.height/200;
    const buildMult=0.5+avatarState.build/200;
    const bodyY=200,bodyH=120*heightMult,bodyW=50*buildMult;
    const headY=80,headR=35;
    
    // Draw based on layer style
    if(avatarState.layerStyle==='outline'){
      ctx.strokeStyle=avatarState.skinTone;
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.arc(w/2,headY,headR,0,Math.PI*2);
      ctx.stroke();
      ctx.strokeRect(w/2-bodyW/2,bodyY,bodyW,bodyH);
      ctx.beginPath();
      ctx.moveTo(w/2-bodyW/2,bodyY);
      ctx.lineTo(w/2-bodyW/2-30,bodyY+50);
      ctx.moveTo(w/2+bodyW/2,bodyY);
      ctx.lineTo(w/2+bodyW/2+30,bodyY+50);
      ctx.stroke();
    }
    
    if(avatarState.layerStyle==='flat'){
      ctx.fillStyle=avatarState.skinTone;
      ctx.beginPath();
      ctx.arc(w/2,headY,headR,0,Math.PI*2);
      ctx.fill();
      ctx.fillRect(w/2-bodyW/2,bodyY,bodyW,bodyH);
      ctx.fillRect(w/2-bodyW/2-30,bodyY+50,25,40);
      ctx.fillRect(w/2+bodyW/2+5,bodyY+50,25,40);
    }
    
    if(avatarState.layerStyle==='shaded'){
      ctx.fillStyle=avatarState.skinTone;
      ctx.beginPath();
      ctx.arc(w/2,headY,headR,0,Math.PI*2);
      ctx.fill();
      ctx.fillRect(w/2-bodyW/2,bodyY,bodyW,bodyH);
      ctx.fillStyle='rgba(0,0,0,0.2)';
      ctx.fillRect(w/2-bodyW/2,bodyY+bodyH-20,bodyW,20);
    }
    
    if(avatarState.layerStyle==='textured'){
      ctx.fillStyle=avatarState.skinTone;
      ctx.beginPath();
      ctx.arc(w/2,headY,headR,0,Math.PI*2);
      ctx.fill();
      ctx.fillRect(w/2-bodyW/2,bodyY,bodyW,bodyH);
      ctx.fillStyle='rgba(255,255,255,0.1)';
      for(let i=0;i<5;i++){
        ctx.beginPath();
        ctx.arc(w/2+Math.random()*bodyW-bodyW/2,headY+Math.random()*headR,2,0,Math.PI*2);
        ctx.fill();
      }
    }
    
    // Hair
    ctx.fillStyle=avatarState.hairColor;
    if(avatarState.hairstyle==='long'){
      ctx.beginPath();
      ctx.ellipse(w/2,headY,headR*0.9,headR*1.2,0,0,Math.PI*2);
      ctx.fill();
    }
    if(avatarState.hairstyle==='short'){
      ctx.beginPath();
      ctx.ellipse(w/2,headY,headR*0.8,headR*0.95,0,0,Math.PI*2);
      ctx.fill();
    }
    if(avatarState.hairstyle==='curly'){
      for(let i=0;i<6;i++){
        ctx.beginPath();
        ctx.arc(w/2+Math.cos(i*Math.PI/3)*headR*0.8,headY+Math.sin(i*Math.PI/3)*headR*0.8,headR*0.3,0,Math.PI*2);
        ctx.fill();
      }
    }
    
    // Outfit
    ctx.fillStyle=avatarState.outfitColor;
    ctx.fillRect(w/2-bodyW/2,bodyY,bodyW,bodyH);
    
    // Eyes and expression
    ctx.fillStyle='#000';
    const eyeX=w/2-(headR*0.3);
    const eyeY=headY-headR*0.2;
    const eyeSize=5;
    
    if(avatarState.expression==='smile'){
      ctx.beginPath();
      ctx.arc(eyeX,eyeY,eyeSize,0,Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeX+headR*0.6,eyeY,eyeSize,0,Math.PI*2);
      ctx.fill();
      ctx.strokeStyle='#000';
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.arc(w/2,headY+headR*0.3,headR*0.2,0,Math.PI);
      ctx.stroke();
    }
    
    if(avatarState.expression==='neutral'){
      ctx.beginPath();
      ctx.arc(eyeX,eyeY,eyeSize,0,Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eyeX+headR*0.6,eyeY,eyeSize,0,Math.PI*2);
      ctx.fill();
      ctx.strokeStyle='#000';
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(w/2-headR*0.15,headY+headR*0.3);
      ctx.lineTo(w/2+headR*0.15,headY+headR*0.3);
      ctx.stroke();
    }
    
    if(avatarState.expression==='surprised'){
      ctx.strokeStyle='#000';
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.arc(eyeX,eyeY,eyeSize,0,Math.PI*2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(eyeX+headR*0.6,eyeY,eyeSize,0,Math.PI*2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w/2,headY+headR*0.3,headR*0.15,0,Math.PI*2);
      ctx.stroke();
    }
    
    ctx.globalAlpha=1;
    if(avatarState.rotation!==0)ctx.restore();
    }catch(e){
      console.error('❌ Error drawing avatar:',e);
    }
  };
  
  // Helper function to safely add listeners with logging
  const safeAddListener=(selector,event,callback,useId=false)=>{
    try{
      const elements=useId?[document.getElementById(selector)]:document.querySelectorAll(selector);
      if(!elements||elements.length===0){
        console.warn(`⚠ No elements found for selector: ${selector}`);
        return;
      }
      elements.forEach(el=>{
        if(el)el.addEventListener(event,callback);
      });
      console.log(`✓ Listener added: ${selector} (${elements.length} element(s))`);
    }catch(e){
      console.error(`❌ Error adding listener to ${selector}:`,e);
    }
  };
  
  // Update display values
  const updateSliderValues=()=>{
    try{
      const eyeEl=document.getElementById('eyeValue');
      const noseEl=document.getElementById('noseValue');
      const mouthEl=document.getElementById('mouthValue');
      const heightEl=document.getElementById('heightValue');
      const buildEl=document.getElementById('buildValue');
      
      if(eyeEl)eyeEl.textContent=avatarState.eyes+'%';
      if(noseEl)noseEl.textContent=avatarState.nose+'%';
      if(mouthEl)mouthEl.textContent=avatarState.mouth+'%';
      if(heightEl)heightEl.textContent=avatarState.height+'%';
      if(buildEl)buildEl.textContent=avatarState.build+'%';
    }catch(e){
      console.error('❌ Error updating slider values:',e);
    }
  };
  
  // Base model selection with error handling
  try{
    const baseModelBtns=document.querySelectorAll('.avatar-base-btn');
    if(baseModelBtns.length===0)console.warn('⚠ No base model buttons found');
    baseModelBtns.forEach(btn=>{
      btn.addEventListener('click',e=>{
        document.querySelectorAll('.avatar-base-btn').forEach(b=>b.classList.remove('active'));
        e.target.classList.add('active');
        avatarState.baseModel=e.target.dataset.model;
        drawAvatar();
      });
    });
    console.log(`✓ Base model listeners added (${baseModelBtns.length})`);
  }catch(e){
    console.error('❌ Error adding base model listeners:',e);
  }
  
  // Pose selection with error handling
  try{
    const poseBtns=document.querySelectorAll('.avatar-pose-btn');
    if(poseBtns.length===0)console.warn('⚠ No pose buttons found');
    poseBtns.forEach(btn=>{
      btn.addEventListener('click',e=>{
        document.querySelectorAll('.avatar-pose-btn').forEach(b=>b.classList.remove('active'));
        e.target.classList.add('active');
        avatarState.pose=e.target.dataset.pose;
        drawAvatar();
      });
    });
    console.log(`✓ Pose listeners added (${poseBtns.length})`);
  }catch(e){
    console.error('❌ Error adding pose listeners:',e);
  }
  
  // Expression selection with error handling
  try{
    const exprBtns=document.querySelectorAll('.avatar-expr-btn');
    if(exprBtns.length===0)console.warn('⚠ No expression buttons found');
    exprBtns.forEach(btn=>{
      btn.addEventListener('click',e=>{
        document.querySelectorAll('.avatar-expr-btn').forEach(b=>b.classList.remove('active'));
        e.target.classList.add('active');
        avatarState.expression=e.target.dataset.expr;
        drawAvatar();
      });
    });
    console.log(`✓ Expression listeners added (${exprBtns.length})`);
  }catch(e){
    console.error('❌ Error adding expression listeners:',e);
  }
  
  // Randomize with error handling
  try{
    const randomizeBtn=document.getElementById('avatarRandomize');
    if(!randomizeBtn){
      console.warn('⚠ Randomize button not found');
    }else{
      randomizeBtn.addEventListener('click',()=>{
        try{
          avatarState={
            baseModel:['male','female','neutral','fantasy'][Math.floor(Math.random()*4)],
            pose:['standing','sitting','action','dynamic'][Math.floor(Math.random()*4)],
            expression:['smile','neutral','surprised','angry','sad','cool'][Math.floor(Math.random()*6)],
            eyes:Math.floor(Math.random()*100),nose:Math.floor(Math.random()*100),mouth:Math.floor(Math.random()*100),
            hairstyle:['short','long','curly','bald'][Math.floor(Math.random()*4)],
            hairColor:['#2C3E50','#8B4513','#FFD700','#FF1493'][Math.floor(Math.random()*4)],
            height:Math.floor(Math.random()*100),build:Math.floor(Math.random()*100),
            outfit:['casual','formal','fantasy','scifi'][Math.floor(Math.random()*4)],
            outfitColor:['#FF6B6B','#4ECDC4','#FFD93D','#A8E6CF'][Math.floor(Math.random()*4)],
            skinTone:['#F4A460','#CD853F','#8B6914','#FFD9B3'][Math.floor(Math.random()*4)],
            theme:['warm','cool','pastel','neon'][Math.floor(Math.random()*4)],
            rotation:Math.floor(Math.random()*360)-180,
            layerStyle:['outline','flat','shaded','textured'][Math.floor(Math.random()*4)],
            accessories:[]
          };
          console.log('✓ Avatar randomized');
          updateUI();
          drawAvatar();
        }catch(e){
          console.error('❌ Error randomizing avatar:',e);
        }
      });
      console.log('✓ Randomize listener added');
    }
  }catch(e){
    console.error('❌ Error setting up randomize:',e);
  }
  
  // Face sliders with error handling
  try{
    const eyesSlider=document.getElementById('avatarEyes');
    const noseSlider=document.getElementById('avatarNose');
    const mouthSlider=document.getElementById('avatarMouth');
    
    if(eyesSlider){
      eyesSlider.addEventListener('input',e=>{
        avatarState.eyes=parseInt(e.target.value)||0;
        updateSliderValues();
        drawAvatar();
      });
    }
    if(noseSlider){
      noseSlider.addEventListener('input',e=>{
        avatarState.nose=parseInt(e.target.value)||0;
        updateSliderValues();
        drawAvatar();
      });
    }
    if(mouthSlider){
      mouthSlider.addEventListener('input',e=>{
        avatarState.mouth=parseInt(e.target.value)||0;
        updateSliderValues();
        drawAvatar();
      });
    }
    console.log('✓ Face slider listeners added');
  }catch(e){
    console.error('❌ Error adding face sliders:',e);
  }
  
  // Hair styles
  document.querySelectorAll('[data-hair]').forEach(btn=>{
    btn.onclick=e=>{
      avatarState.hairstyle=e.target.dataset.hair;
      document.querySelectorAll('[data-hair]').forEach(b=>b.classList.remove('active'));
      e.target.classList.add('active');
      drawAvatar();
    };
  });
  
  // Hair color
  document.getElementById('hairColorPicker').oninput=e=>{
    avatarState.hairColor=e.target.value;
    drawAvatar();
  };
  
  document.querySelectorAll('.color-preset').forEach(btn=>{
    btn.onclick=()=>{
      avatarState.hairColor=btn.dataset.color;
      document.getElementById('hairColorPicker').value=btn.dataset.color;
      drawAvatar();
    };
  });
  
  // Body proportions
  document.getElementById('avatarHeight').oninput=e=>{
    avatarState.height=parseInt(e.target.value);
    updateSliderValues();
    drawAvatar();
  };
  
  document.getElementById('avatarBuild').oninput=e=>{
    avatarState.build=parseInt(e.target.value);
    updateSliderValues();
    drawAvatar();
  };
  
  // Outfit style
  document.querySelectorAll('[data-outfit]').forEach(btn=>{
    btn.onclick=e=>{
      avatarState.outfit=e.target.dataset.outfit;
      document.querySelectorAll('[data-outfit]').forEach(b=>b.classList.remove('active'));
      e.target.classList.add('active');
      drawAvatar();
    };
  });
  
  // Outfit color
  document.getElementById('outfitColorPicker').oninput=e=>{
    avatarState.outfitColor=e.target.value;
    drawAvatar();
  };
  
  document.querySelectorAll('.outfit-preset').forEach(btn=>{
    btn.onclick=()=>{
      avatarState.outfitColor=btn.dataset.color;
      document.getElementById('outfitColorPicker').value=btn.dataset.color;
      drawAvatar();
    };
  });
  
  // Skin tone
  document.querySelectorAll('.skin-preset').forEach(btn=>{
    btn.onclick=()=>{
      avatarState.skinTone=btn.dataset.skin;
      document.getElementById('skinTonePicker').value=btn.dataset.skin;
      drawAvatar();
    };
  });
  
  document.getElementById('skinTonePicker').oninput=e=>{
    avatarState.skinTone=e.target.value;
    drawAvatar();
  };
  
  // Theme
  document.querySelectorAll('[data-theme]').forEach(btn=>{
    btn.onclick=e=>{
      avatarState.theme=e.target.dataset.theme;
      document.querySelectorAll('[data-theme]').forEach(b=>b.classList.remove('active'));
      e.target.classList.add('active');
    };
  });
  
  // Background
  document.querySelectorAll('[data-bg]').forEach(btn=>{
    btn.onclick=e=>{
      const bgTypes={'beach':'linear-gradient(to bottom,#87CEEB,#FFE4B5)','cyber':'linear-gradient(135deg,#0a0a2e,#16213e)','forest':'linear-gradient(to bottom,#228B22,#90EE90)','space':'linear-gradient(to bottom,#000,#1a0033)'};
      avatarState.background=bgTypes[e.target.dataset.bg]||'none';
      drawAvatar();
    };
  });
  
  // Background import
  document.getElementById('avatarBgImport').onclick=()=>{
    const input=document.createElement('input');
    input.type='file';
    input.accept='image/*';
    input.onchange=()=>{
      const file=input.files[0];
      const reader=new FileReader();
      reader.onload=e=>{
        const img=new Image();
        img.onload=()=>{
          const canvas=document.createElement('canvas');
          canvas.width=300;canvas.height=400;
          const ctx=canvas.getContext('2d');
          ctx.drawImage(img,0,0,300,400);
          avatarState.background='url('+canvas.toDataURL()+')';
          drawAvatar();
        };
        img.src=e.target.result;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };
  
  // Rotation
  document.getElementById('avatarRotation').oninput=e=>{
    avatarState.rotation=parseInt(e.target.value);
    drawAvatar();
  };
  
  document.getElementById('avatarResetRotation').onclick=()=>{
    document.getElementById('avatarRotation').value='0';
    avatarState.rotation=0;
    drawAvatar();
  };
  
  // Layer style
  document.querySelectorAll('[data-layer]').forEach(btn=>{
    btn.onclick=e=>{
      avatarState.layerStyle=e.target.dataset.layer;
      document.querySelectorAll('[data-layer]').forEach(b=>b.classList.remove('active'));
      e.target.classList.add('active');
      drawAvatar();
    };
  });
  
  // Save preset with error handling
  try{
    const savePresetBtn=document.getElementById('avatarSavePreset');
    if(!savePresetBtn){
      console.warn('⚠ Save preset button not found');
    }else{
      savePresetBtn.addEventListener('click',()=>{
        try{
          const name=prompt('Save avatar preset as:','My Avatar');
          if(!name){
            console.log('✓ Preset save cancelled');
            return;
          }
          
          const preset={name:name.substring(0,50),state:{...avatarState},timestamp:Date.now()};
          avatarPresets.push(preset);
          
          try{
            localStorage.setItem('avatarPresets',JSON.stringify(avatarPresets));
            console.log(`✓ Avatar preset saved: ${name} (Total: ${avatarPresets.length})`);
            alert(`✓ Avatar preset saved: ${name}`);
          }catch(e){
            console.error('❌ Error saving to localStorage:',e);
            alert('Error saving preset to storage');
          }
        }catch(e){
          console.error('❌ Error during preset save:',e);
        }
      });
      console.log('✓ Save preset listener added');
    }
  }catch(e){
    console.error('❌ Error setting up save preset:',e);
  }
  
  // Export with error handling
  try{
    const exportBtn=document.getElementById('avatarExport');
    if(!exportBtn){
      console.warn('⚠ Export button not found');
    }else{
      exportBtn.addEventListener('click',()=>{
        try{
          if(!avatarCanvas){
            console.error('❌ Avatar canvas not initialized');
            alert('Please create an avatar first');
            return;
          }
          
          const dataUrl=avatarCanvas.toDataURL('image/png');
          if(!dataUrl){
            console.error('❌ Failed to generate data URL');
            alert('Error generating avatar image');
            return;
          }
          
          const link=document.createElement('a');
          link.href=dataUrl;
          link.download='avatar-'+Date.now()+'.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          console.log('✓ Avatar exported as PNG');
          alert('✓ Avatar exported as PNG!');
        }catch(e){
          console.error('❌ Error exporting avatar:',e);
          alert('Error exporting avatar: '+e.message);
        }
      });
      console.log('✓ Export listener added');
    }
  }catch(e){
    console.error('❌ Error setting up export:',e);
  }
  
  // Apply to canvas with error handling
  try{
    const applyBtn=document.getElementById('avatarApply');
    if(!applyBtn){
      console.warn('⚠ Apply button not found');
    }else{
      applyBtn.addEventListener('click',()=>{
        try{
          if(!avatarCanvas){
            console.error('❌ Avatar canvas not initialized');
            alert('Please create an avatar first');
            return;
          }
          
          if(!drawCanvas){
            console.error('❌ Draw canvas not found');
            alert('Draw canvas not available');
            return;
          }
          
          // Create layer object with all properties
          const avatarLayer={
            id:'layer_'+Date.now(),
            canvas:document.createElement('canvas'),
            ctx:null,
            visible:true,
            opacity:1,
            blendMode:'normal',
            name:'Avatar-'+new Date().toLocaleTimeString(),
            locked:false
          };
          
          avatarLayer.canvas.width=drawCanvas.width;
          avatarLayer.canvas.height=drawCanvas.height;
          avatarLayer.ctx=avatarLayer.canvas.getContext('2d');
          
          if(!avatarLayer.ctx){
            console.error('❌ Cannot get 2D context for avatar layer');
            alert('Error creating avatar layer');
            return;
          }
          
          // Draw avatar centered on canvas
          const avatarX=drawCanvas.width/2-150;
          const avatarY=Math.max(0,drawCanvas.height/2-200);
          avatarLayer.ctx.drawImage(avatarCanvas,avatarX,avatarY);
          
          layers.push(avatarLayer);
          console.log(`✓ Avatar applied as new layer: ${avatarLayer.name}`);
          
          setActiveLayer(avatarLayer.id);
          updateLayersList();
          renderLayers();
          saveHistory();
          
          alert('✓ Avatar applied to canvas as new layer!');
        }catch(e){
          console.error('❌ Error applying avatar to canvas:',e);
          alert('Error applying avatar: '+e.message);
        }
      });
      console.log('✓ Apply button listener added');
    }
  }catch(e){
    console.error('❌ Error setting up apply button:',e);
  }
  
  // Reset with error handling
  try{
    const resetBtn=document.getElementById('avatarReset');
    if(!resetBtn){
      console.warn('⚠ Reset button not found');
    }else{
      resetBtn.addEventListener('click',()=>{
        try{
          if(confirm('Reset avatar to defaults?')){
            avatarState={
              baseModel:'neutral',pose:'standing',expression:'smile',
              eyes:50,nose:50,mouth:50,
              hairstyle:'long',hairColor:'#FF8C42',
              accessories:[],
              height:50,build:50,outfit:'casual',outfitColor:'#5A90FF',
              skinTone:'#F4A460',theme:'warm',
              background:'none',rotation:0,
              layerStyle:'outline'
            };
            console.log('✓ Avatar reset to defaults');
            updateUI();
            drawAvatar();
          }
        }catch(e){
          console.error('❌ Error resetting avatar:',e);
        }
      });
      console.log('✓ Reset listener added');
    }
  }catch(e){
    console.error('❌ Error setting up reset:',e);
  }
  
  // Update all UI elements
  const updateUI=()=>{
    document.querySelectorAll('.avatar-base-btn').forEach(b=>b.classList.toggle('active',b.dataset.model===avatarState.baseModel));
    document.querySelectorAll('.avatar-pose-btn').forEach(b=>b.classList.toggle('active',b.dataset.pose===avatarState.pose));
    document.querySelectorAll('.avatar-expr-btn').forEach(b=>b.classList.toggle('active',b.dataset.expr===avatarState.expression));
    document.querySelectorAll('[data-hair]').forEach(b=>b.classList.toggle('active',b.dataset.hair===avatarState.hairstyle));
    document.querySelectorAll('[data-outfit]').forEach(b=>b.classList.toggle('active',b.dataset.outfit===avatarState.outfit));
    document.querySelectorAll('[data-layer]').forEach(b=>b.classList.toggle('active',b.dataset.layer===avatarState.layerStyle));
    document.getElementById('avatarRotation').value=avatarState.rotation;
    document.getElementById('hairColorPicker').value=avatarState.hairColor;
    document.getElementById('outfitColorPicker').value=avatarState.outfitColor;
    document.getElementById('skinTonePicker').value=avatarState.skinTone;
    updateSliderValues();
  };
  
  // Sidebar toggle with error handling
  try{
    const avatarPanel=document.querySelector('.avatar-panel-section');
    if(!avatarPanel){
      console.warn('⚠ Avatar panel section not found');
    }else{
      const avatarToggle=avatarPanel.querySelector('button.toggle');
      const avatarBody=avatarPanel.querySelector('.panel-body');
      const avatarOptions=document.getElementById('avatarOptions');
      
      if(!avatarToggle || !avatarBody){
        console.warn('⚠ Avatar toggle or body not found');
      }else{
        // Toggle via avatarOptions button
        if(avatarOptions){
          avatarOptions.addEventListener('click',(e)=>{
            e.stopPropagation();
            try{
              const isHidden=avatarBody.style.display==='none';
              avatarBody.style.display=isHidden?'block':'none';
              avatarToggle.textContent=avatarBody.style.display==='none'?'+':'−';
              if(avatarBody.style.display==='block'){
                console.log('✓ Avatar panel opened');
                drawAvatar();
              }else{
                console.log('✓ Avatar panel closed');
              }
            }catch(e){
              console.error('❌ Error toggling avatar panel:',e);
            }
          });
          console.log('✓ Avatar options button listener added');
        }
        
        // Toggle via header button
        avatarToggle.addEventListener('click',(e)=>{
          e.stopPropagation();
          try{
            const isHidden=avatarBody.style.display==='none';
            avatarBody.style.display=isHidden?'block':'none';
            avatarToggle.textContent=avatarBody.style.display==='none'?'+':'−';
            if(avatarBody.style.display==='block'){
              console.log('✓ Avatar panel opened (header)');
              drawAvatar();
            }else{
              console.log('✓ Avatar panel closed (header)');
            }
          }catch(e){
            console.error('❌ Error toggling via header:',e);
          }
        });
        console.log('✓ Avatar toggle button listener added');
      }
    }
  }catch(e){
    console.error('❌ Error setting up panel toggle:',e);
  }
  
  // Initial draw
  try{
    initAvatarCanvas();
    drawAvatar();
    console.log('✓ Avatar panel initialized successfully');
  }catch(e){
    console.error('❌ Error during initial avatar draw:',e);
  }
}

// Initialize Anatomy Panel
function initAnatomyPanel(){
  let currentPart='full';
  let currentViewMode='gesture';
  let currentPose='standing';
  let symmetryAxis='vertical';
  let guideOpacity=0.6;
  let guideRotation=0;
  let gestureTimerDuration=60;
  let gestureTimerRunning=false;
  let gestureTimerInterval=null;
  let anatomyOverlay=null;
  let anatomyNotes={
    hands:{description:'Hands have 27 bones divided into carpals (wrist), metacarpals (palm), and phalanges (fingers). Remember the proportions: palm length equals finger length.',tips:['Draw gesture lines first','Joint markers at knuckles','Symmetry is key']},
    face:{description:'Divide face into thirds horizontally. Eyes at middle, ears behind jawline. Study bone structure under skin.',tips:['Landmark the grid','Eyes are equidistant','Asymmetry is natural']},
    torso:{description:'Rib cage is roughly 1.5x the width of the pelvis. Spine curves naturally, creating subtle S-shape.',tips:['Identify landmarks','Follow spinal curves','Chest and pelvis angle']},
    legs:{description:'Femur (thighbone) is roughly equal to tibia+fibula (lower leg). Hip to knee = knee to ankle in standing pose.',tips:['Mark major joints','Weight distribution','Natural curves and angles']},
    feet:{description:'Foot arches matter. Heel-ball-toe create natural weight path. Toes splay when relaxed.',tips:['Understand structure','Weight placement','Perspective varies']},
    full:{description:'Full figure study combines all parts. Establish proportions: head = 1 unit, body = 7-8 units tall (varies by style).',tips:['Gesture first','Structure second','Details last']}
  };
  
  // Anatomical data for rendering
  const anatomyData={
    gesture:{full:[{type:'line',points:[[256,100],[256,250],[256,400]]},{type:'circle',x:256,y:80,r:30}]},
    skeleton:{full:[{type:'bone',name:'Skull',x:256,y:100,w:60,h:70},{type:'bone',name:'Spine',x:256,y:200,w:15,h:180},{type:'bone',name:'Femur',x:240,y:320,w:20,h:100},{type:'bone',name:'Tibia',x:240,y:420,w:18,h:80}]},
    muscle:{full:[{type:'muscle',name:'Deltoid',x:200,y:150,w:40,h:40,color:'#ff6b9d'},{type:'muscle',name:'Pectoralis',x:240,y:180,w:50,h:60,color:'#ff6b9d'},{type:'muscle',name:'Rectus Abdominis',x:256,y:240,w:40,h:80,color:'#ff6b9d'}]},
    skin:{full:[{type:'outline',closed:true}]}
  };
  
  // Gesture Timer
  const startTimer=()=>{
    if(gestureTimerRunning)return;
    gestureTimerRunning=true;
    let timeLeft=gestureTimerDuration;
    const timerDisplay=document.getElementById('timerDisplay');
    const startBtn=document.getElementById('startGestureTimer');
    timerDisplay.style.display='block';
    startBtn.classList.add('active');
    startBtn.textContent='Stop Timer';
    
    const updateDisplay=()=>{
      const mins=Math.floor(timeLeft/60);
      const secs=timeLeft%60;
      timerDisplay.textContent=`${mins}:${secs.toString().padStart(2,'0')}`;
    };
    updateDisplay();
    
    gestureTimerInterval=setInterval(()=>{
      timeLeft--;
      updateDisplay();
      if(timeLeft<0){
        clearInterval(gestureTimerInterval);
        gestureTimerRunning=false;
        timerDisplay.textContent='Time!';
        timerDisplay.style.color='#e74c3c';
        startBtn.classList.remove('active');
        startBtn.textContent='Start Timer';
        setTimeout(()=>{
          timerDisplay.style.display='none';
          timerDisplay.style.color='var(--accent)';
        },2000);
      }
    },1000);
  };
  
  document.getElementById('startGestureTimer').onclick=()=>{
    if(gestureTimerRunning){
      clearInterval(gestureTimerInterval);
      gestureTimerRunning=false;
      document.getElementById('timerDisplay').style.display='none';
      document.getElementById('startGestureTimer').classList.remove('active');
      document.getElementById('startGestureTimer').textContent='Start Timer';
    }else{
      startTimer();
    }
  };
  
  // Timer duration selector
  document.querySelectorAll('[data-duration]').forEach(btn=>{
    btn.onclick=e=>{
      document.querySelectorAll('[data-duration]').forEach(b=>b.classList.remove('active'));
      e.target.classList.add('active');
      gestureTimerDuration=parseInt(e.target.dataset.duration);
    };
  });
  
  // Body part & view mode selection
  document.querySelectorAll('.anatomy-part-btn').forEach(btn=>{
    btn.onclick=e=>{
      document.querySelectorAll('.anatomy-part-btn').forEach(b=>b.classList.remove('active'));
      e.target.classList.add('active');
      currentPart=e.target.dataset.part;
      updateAnatomyGuides();
    };
  });
  
  document.querySelectorAll('.anatomy-view-btn').forEach(btn=>{
    btn.onclick=e=>{
      document.querySelectorAll('.anatomy-view-btn').forEach(b=>b.classList.remove('active'));
      e.target.classList.add('active');
      currentViewMode=e.target.dataset.view;
      updateAnatomyGuides();
    };
  });
  
  // Pose library
  document.querySelectorAll('.anatomy-pose-btn').forEach(btn=>{
    btn.onclick=e=>{
      currentPose=e.target.dataset.pose;
      updateAnatomyGuides();
    };
  });
  
  // Symmetry toggle
  document.getElementById('symmetryToggle').onchange=e=>{
    if(e.target.checked){
      document.querySelectorAll('[id^="symmetry"]').forEach(btn=>btn.style.display='inline-block');
    }else{
      document.querySelectorAll('[id^="symmetry"]').forEach(btn=>btn.style.display='none');
    }
  };
  
  // Opacity slider
  document.getElementById('anatGuideOpacity').oninput=e=>{
    guideOpacity=parseFloat(e.target.value)/100;
    updateAnatomyGuides();
  };
  
  // Rotation controls
  document.getElementById('anatRotation').oninput=e=>{
    guideRotation=parseInt(e.target.value);
    updateAnatomyGuides();
  };
  
  document.getElementById('anatResetRotation').onclick=()=>{
    document.getElementById('anatRotation').value='0';
    guideRotation=0;
    updateAnatomyGuides();
  };
  
  // Update anatomy guides (main rendering function)
  const updateAnatomyGuides=()=>{
    const canvas=drawCanvas;
    if(!anatomyOverlay){
      anatomyOverlay=document.createElement('canvas');
      anatomyOverlay.id='anatomyOverlayCanvas';
      anatomyOverlay.width=canvas.width;
      anatomyOverlay.height=canvas.height;
      canvas.parentElement.appendChild(anatomyOverlay);
    }
    
    const ctx=anatomyOverlay.getContext('2d');
    ctx.clearRect(0,0,anatomyOverlay.width,anatomyOverlay.height);
    ctx.globalAlpha=guideOpacity;
    ctx.globalCompositeOperation='multiply';
    
    // Apply rotation
    if(guideRotation!==0){
      ctx.save();
      ctx.translate(canvas.width/2,canvas.height/2);
      ctx.rotate(guideRotation*Math.PI/180);
      ctx.translate(-canvas.width/2,-canvas.height/2);
    }
    
    // Draw based on view mode
    if(currentViewMode==='gesture'){
      drawGestureGuides(ctx,canvas);
    }else if(currentViewMode==='skeleton'){
      drawSkeletonGuides(ctx,canvas);
    }else if(currentViewMode==='muscle'){
      drawMuscleGuides(ctx,canvas);
    }else if(currentViewMode==='skin'){
      drawSkinGuides(ctx,canvas);
    }
    
    // Draw symmetry guide if enabled
    if(document.getElementById('symmetryToggle').checked){
      ctx.strokeStyle='rgba(255,200,0,0.3)';
      ctx.setLineDash([2,2]);
      if(symmetryAxis==='vertical'){
        ctx.beginPath();ctx.moveTo(canvas.width/2,0);ctx.lineTo(canvas.width/2,canvas.height);ctx.stroke();
      }else{
        ctx.beginPath();ctx.moveTo(0,canvas.height/2);ctx.lineTo(canvas.width,canvas.height/2);ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    
    if(guideRotation!==0)ctx.restore();
    ctx.globalAlpha=1;
    ctx.globalCompositeOperation='source-over';
  };
  
  // Drawing functions for each view mode
  const drawGestureGuides=(ctx,canvas)=>{
    ctx.strokeStyle='rgba(255,152,0,0.5)';
    ctx.lineWidth=2;
    // Simplified gesture guide
    const cx=canvas.width/2,cy=canvas.height/2,h=canvas.height/2;
    ctx.beginPath();ctx.moveTo(cx,cy-h*0.4);ctx.lineTo(cx,cy+h*0.6);ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy-h*0.5,h*0.12,0,Math.PI*2);ctx.stroke();
  };
  
  const drawSkeletonGuides=(ctx,canvas)=>{
    ctx.strokeStyle='#ff6b9d';
    ctx.fillStyle='rgba(255,107,157,0.3)';
    ctx.lineWidth=1.5;
    const cx=canvas.width/2,cy=canvas.height/2,h=canvas.height/2;
    // Skull
    ctx.beginPath();ctx.ellipse(cx,cy-h*0.45,h*0.15,h*0.18,0,0,Math.PI*2);ctx.stroke();
    // Spine
    ctx.beginPath();ctx.moveTo(cx,cy-h*0.3);ctx.lineTo(cx,cy+h*0.2);ctx.stroke();
    // Rib cage outline
    ctx.beginPath();ctx.ellipse(cx,cy-h*0.1,h*0.2,h*0.15,0,0,Math.PI*2);ctx.stroke();
    // Pelvis
    ctx.beginPath();ctx.ellipse(cx,cy+h*0.15,h*0.18,h*0.1,0,0,Math.PI*2);ctx.stroke();
    // Femurs
    ctx.beginPath();ctx.moveTo(cx-h*0.1,cy+h*0.25);ctx.lineTo(cx-h*0.1,cy+h*0.55);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx+h*0.1,cy+h*0.25);ctx.lineTo(cx+h*0.1,cy+h*0.55);ctx.stroke();
  };
  
  const drawMuscleGuides=(ctx,canvas)=>{
    ctx.strokeStyle='#4a90e2';
    ctx.fillStyle='rgba(74,144,226,0.1)';
    ctx.lineWidth=1;
    const cx=canvas.width/2,cy=canvas.height/2,h=canvas.height/2;
    // Chest muscles
    ctx.beginPath();ctx.ellipse(cx-h*0.1,cy-h*0.15,h*0.12,h*0.1,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(cx+h*0.1,cy-h*0.15,h*0.12,h*0.1,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    // Abdomen
    ctx.fillStyle='rgba(74,144,226,0.15)';ctx.fillRect(cx-h*0.1,cy-h*0.05,h*0.2,h*0.25);
  };
  
  const drawSkinGuides=(ctx,canvas)=>{
    ctx.strokeStyle='rgba(200,200,200,0.3)';
    ctx.lineWidth=1;
    const cx=canvas.width/2,cy=canvas.height/2,h=canvas.height/2;
    // Proportional divisions
    for(let y=0;y<canvas.height;y+=h*0.1){
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();
    }
  };
  
  // Practice steps
  document.getElementById('stepGesture').onclick=()=>{
    currentViewMode='gesture';
    document.querySelectorAll('.anatomy-view-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById('viewGesture').classList.add('active');
    showAnatomyNote('Gesture mode: Capture the action and flow. Simple lines showing pose and movement.');
    updateAnatomyGuides();
  };
  
  document.getElementById('stepStructure').onclick=()=>{
    currentViewMode='skeleton';
    document.querySelectorAll('.anatomy-view-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById('viewSkeleton').classList.add('active');
    showAnatomyNote('Structure mode: Block out proportions using bones and joints. Establish accurate relationships.');
    updateAnatomyGuides();
  };
  
  document.getElementById('stepDetail').onclick=()=>{
    currentViewMode='muscle';
    document.querySelectorAll('.anatomy-view-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById('viewMuscle').classList.add('active');
    showAnatomyNote('Detail mode: Add muscles and skin. Study how tissues wrap over bone structure.');
    updateAnatomyGuides();
  };
  
  const showAnatomyNote=(message)=>{
    const notes=anatomyNotes[currentPart];
    alert(`${notes.description}\n\nTips:\n${notes.tips.join('\n')}\n\n${message}`);
  };
  
  // Medium simulation
  ['Pencil','Ink','Watercolor','Charcoal'].forEach(medium=>{
    const btn=document.getElementById(`medium${medium}`);
    if(btn)btn.onclick=()=>{
      const opacity=currentViewMode==='gesture'?0.5:(medium==='Watercolor'?0.4:0.7);
      if(anatomyOverlay)anatomyOverlay.style.opacity=opacity.toString();
      alert(`${medium} mode: Adjusting guide opacity to ${(opacity*100).toFixed(0)}% for better blending.`);
    };
  });
  
  // Shading toggle
  document.getElementById('shadingToggle').onchange=e=>{
    if(e.target.checked){
      alert('Light source: Upper left at 45°\nCreate shadows opposite to light direction.');
    }
  };
  
  // Save, export, apply
  document.getElementById('anatomySaveGuideBtn').onclick=()=>{
    const guideName=prompt('Save custom guide as:','My Guide');
    if(!guideName)return;
    const guide={name:guideName,part:currentPart,viewMode:currentViewMode,pose:currentPose,rotation:guideRotation};
    let guides=JSON.parse(localStorage.getItem('anatomyGuides')||'[]');
    guides.push(guide);
    localStorage.setItem('anatomyGuides',JSON.stringify(guides));
    alert('Guide saved as: '+guideName);
  };
  
  document.getElementById('anatomyExportSheetBtn').onclick=()=>{
    const canvas=document.createElement('canvas');
    canvas.width=800;canvas.height=600;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,800,600);
    ctx.fillStyle='#000';ctx.font='bold 20px Arial';ctx.fillText('Anatomy Practice Sheet',20,40);
    ctx.font='14px Arial';ctx.fillText(`Part: ${currentPart} | View: ${currentViewMode} | Pose: ${currentPose}`,20,70);
    // Add grid and proportion guides
    for(let i=0;i<800;i+=40){ctx.strokeStyle='rgba(200,200,200,0.2)';ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,600);ctx.stroke();}
    for(let i=0;i<600;i+=40){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(800,i);ctx.stroke();}
    const link=document.createElement('a');
    link.href=canvas.toDataURL('image/png');
    link.download=`anatomy-${currentPart}-${Date.now()}.png`;
    link.click();
    alert('Practice sheet exported!');
  };
  
  document.getElementById('anatomyApplyBtn').onclick=()=>{
    if(!anatomyOverlay||anatomyOverlay.style.display==='none'){
      alert('No anatomy guides to apply. Please select a body part and view mode first.');
      return;
    }
    const guidesLayer={
      canvas:document.createElement('canvas'),
      ctx:null,
      visible:true,
      opacity:guideOpacity,
      blendMode:'screen',
      name:`Anatomy (${currentPart})`
    };
    guidesLayer.canvas.width=drawCanvas.width;
    guidesLayer.canvas.height=drawCanvas.height;
    guidesLayer.ctx=guidesLayer.canvas.getContext('2d');
    guidesLayer.ctx.drawImage(anatomyOverlay,0,0);
    layers.push(guidesLayer);
    updateLayersList();
    renderLayers();
    saveHistory();
    alert('Anatomy guides applied as new layer. You can now draw over them!');
  };
  
  // Sidebar toggle
  const anatPanel=document.querySelector('.anatomy-panel-section');
  const anatToggle=anatPanel?.querySelector('button.toggle');
  const anatBody=anatPanel?.querySelector('.panel-body');
  
  document.getElementById('anatomyOptions')?.addEventListener('click',()=>{
    if(anatBody)anatBody.style.display=anatBody.style.display==='none'?'block':'none';
    if(anatToggle)anatToggle.textContent=anatBody?.style.display==='none'?'+':'−';
  });
  
  anatToggle?.addEventListener('click',e=>{
    e.stopPropagation();
    anatBody.style.display=anatBody.style.display==='none'?'block':'none';
    anatToggle.textContent=anatBody.style.display==='none'?'+':'−';
  });

  // ANATOMY REFERENCE IMAGES DATABASE
  const anatomyReferences={
    hands:[
      {title:'Hand Gesture - Front',url:'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Hands_001.jpg/800px-Hands_001.jpg',description:'Front view of relaxed hand showing palm and fingers'},
      {title:'Hand Anatomy - Skeleton',url:'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Hand_bones-en.svg/800px-Hand_bones-en.svg.png',description:'Skeletal structure of the hand showing 27 bones'},
      {title:'Hand Anatomy - Gesture Poses',url:'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Anatomy_of_human_hand.svg/800px-Anatomy_of_human_hand.svg.png',description:'Different hand gesture poses and positions'},
      {title:'Hand - Gesture Studies',url:'https://via.placeholder.com/300x400?text=Hand+Gesture+Studies',description:'Quick pose studies for hand drawing practice'}
    ],
    face:[
      {title:'Face Proportions - Grid',url:'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Anatomy_of_human_head.svg/600px-Anatomy_of_human_head.svg.png',description:'Face divided into proportional thirds'},
      {title:'Face - Skeleton',url:'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Skull_front.png/600px-Skull_front.png',description:'Skull structure from front view'},
      {title:'Face - Muscles',url:'https://via.placeholder.com/300x400?text=Face+Musculature',description:'Facial muscles and expressions'},
      {title:'Eyes - Detail Study',url:'https://via.placeholder.com/300x400?text=Eye+Anatomy',description:'Detailed eye structure and shading'}
    ],
    torso:[
      {title:'Torso Proportions',url:'https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Anatomy_man_front.png/400px-Anatomy_man_front.png',description:'Front view torso anatomy and proportions'},
      {title:'Ribcage Structure',url:'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Thorax1.png/400px-Thorax1.png',description:'Rib cage and internal structure'},
      {title:'Torso - Gestures',url:'https://via.placeholder.com/300x400?text=Torso+Gestures',description:'Various torso poses and movements'},
      {title:'Chest & Shoulders',url:'https://via.placeholder.com/300x400?text=Chest+Shoulders',description:'Chest muscles and shoulder anatomy'}
    ],
    legs:[
      {title:'Leg Proportions - Front',url:'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Leg_anatomy.png/400px-Leg_anatomy.png',description:'Front view leg showing proper proportions'},
      {title:'Leg Anatomy - Muscles',url:'https://via.placeholder.com/300x400?text=Leg+Muscles',description:'Quadriceps and lower leg muscle groups'},
      {title:'Leg Poses',url:'https://via.placeholder.com/300x400?text=Leg+Poses',description:'Standing, walking, and sitting leg positions'},
      {title:'Knee & Ankle',url:'https://via.placeholder.com/300x400?text=Knee+Ankle',description:'Joint structures and flexion studies'}
    ],
    feet:[
      {title:'Foot - Top View',url:'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Foot.png/600px-Foot.png',description:'Foot structure from top view'},
      {title:'Foot Arches',url:'https://via.placeholder.com/300x400?text=Foot+Arches',description:'Understanding foot arch and weight distribution'},
      {title:'Feet - Various Angles',url:'https://via.placeholder.com/300x400?text=Feet+Angles',description:'Feet from different angles and perspectives'},
      {title:'Toes - Detail',url:'https://via.placeholder.com/300x400?text=Toe+Detail',description:'Individual toe structure and positioning'}
    ],
    full:[
      {title:'Full Figure - Standing Pose',url:'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Anterior_and_posterior_view_of_muscular_system.jpg/400px-Anterior_and_posterior_view_of_muscular_system.jpg',description:'Full body standing gesture pose'},
      {title:'Full Figure - Skeleton',url:'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Human_skeleton.jpg/400px-Human_skeleton.jpg',description:'Complete skeletal system anatomy'},
      {title:'Full Figure - Proportions',url:'https://via.placeholder.com/300x500?text=Body+Proportions',description:'Full body proportions reference'},
      {title:'Figure Gestures - Multiple Poses',url:'https://via.placeholder.com/300x500?text=Figure+Poses',description:'Collection of figure gesture studies'}
    ]
  };

  let currentRefPart='full';
  let currentRefIndex=0;

  function updateReferenceCarousel(){
    const carousel=document.getElementById('anatomyReferenceCarousel');
    if(!carousel)return;
    
    const refs=anatomyReferences[currentRefPart]||[];
    carousel.innerHTML='';
    
    if(refs.length===0){
      carousel.innerHTML='<div style="text-align:center;color:var(--muted);width:100%;">No references available</div>';
      return;
    }
    
    refs.forEach((ref,idx)=>{
      const div=document.createElement('div');
      div.className='anatomy-ref-image' + (idx===currentRefIndex?' active':'');
      div.innerHTML=`<img src="${ref.url}" alt="${ref.title}" onerror="this.src='https://via.placeholder.com/300x400?text=${encodeURIComponent(ref.title)}'">`;
      div.onclick=()=>showAnatomyRefModal(idx);
      carousel.appendChild(div);
    });
  }

  function showAnatomyRefModal(index){
    try{
      const refs=anatomyReferences[currentRefPart]||[];
      if(!refs[index])return;
      
      currentRefIndex=index;
      const ref=refs[index];
      const modal=document.getElementById('anatomyRefModal');
      if(!modal)return;
      
      document.getElementById('anatomyRefTitle').textContent=ref.title;
      document.getElementById('anatomyRefImage').src=ref.url;
      document.getElementById('anatomyRefImage').onerror=function(){
        this.src=`https://via.placeholder.com/600x400?text=${encodeURIComponent(ref.title)}`;
      };
      document.getElementById('anatomyRefInfo').textContent=ref.description;
      
      modal.classList.add('active');
      console.log('✅ Anatomy reference modal opened:',ref.title);
    }catch(e){
      console.error('❌ Error showing reference:',e);
    }
  }

  function closeAnatomyRefModal(){
    const modal=document.getElementById('anatomyRefModal');
    if(modal)modal.classList.remove('active');
  }

  // Body part selections - update references
  document.querySelectorAll('.anatomy-part-btn').forEach(btn=>{
    btn.onclick=e=>{
      document.querySelectorAll('.anatomy-part-btn').forEach(b=>b.classList.remove('active'));
      e.target.classList.add('active');
      currentPart=e.target.dataset.part;
      currentRefPart=e.target.dataset.part;
      currentRefIndex=0;
      updateReferenceCarousel();
      updateAnatomyGuides();
    };
  });

  // Carousel navigation
  document.getElementById('refPrevBtn').onclick=()=>{
    const refs=anatomyReferences[currentRefPart]||[];
    currentRefIndex=(currentRefIndex-1+refs.length)%refs.length;
    updateReferenceCarousel();
  };

  document.getElementById('refNextBtn').onclick=()=>{
    const refs=anatomyReferences[currentRefPart]||[];
    currentRefIndex=(currentRefIndex+1)%refs.length;
    updateReferenceCarousel();
  };

  document.getElementById('refExpandBtn').onclick=()=>{
    showAnatomyRefModal(currentRefIndex);
  };

  // Modal controls
  document.getElementById('closeAnatomyRefBtn').onclick=closeAnatomyRefModal;
  document.getElementById('refModalCloseBtn').onclick=closeAnatomyRefModal;
  
  document.getElementById('refModalPrevBtn').onclick=()=>{
    const refs=anatomyReferences[currentRefPart]||[];
    currentRefIndex=(currentRefIndex-1+refs.length)%refs.length;
    updateReferenceCarousel();
    showAnatomyRefModal(currentRefIndex);
  };

  document.getElementById('refModalNextBtn').onclick=()=>{
    const refs=anatomyReferences[currentRefPart]||[];
    currentRefIndex=(currentRefIndex+1)%refs.length;
    updateReferenceCarousel();
    showAnatomyRefModal(currentRefIndex);
  };

  document.getElementById('refModalDownloadBtn').onclick=()=>{
    const refs=anatomyReferences[currentRefPart]||[];
    const ref=refs[currentRefIndex];
    if(!ref)return;
    const link=document.createElement('a');
    link.href=ref.url;
    link.download=`anatomy-${currentRefPart}-${ref.title.replace(/\s+/g,'-')}.jpg`;
    link.click();
    console.log('✅ Reference image saved:',ref.title);
  };

  document.getElementById('anatomyRefModal').addEventListener('click',e=>{
    if(e.target.id==='anatomyRefModal')closeAnatomyRefModal();
  });

  // Initialize carousel
  updateReferenceCarousel();
  console.log('✅ Anatomy reference images initialized');
}

window.addEventListener('load',()=>{
  resize(); 
  setZoom(1); 
  updateLayersList(); 
  const layerBlendSelect = document.getElementById('layerBlendMode'); 
  if(layerBlendSelect) { 
    const layer = getActiveLayer(); 
    if(layer) layerBlendSelect.value = layer.blendMode; 
  } 
  renderToolOptions(tool); 
  initGridPanel(); 
  initGuidelinesPanel();
  initCollaborationPanel();
  initAnimationPanel();
  initColorSciencePanel();
  initImageAnalysisPanel();
  initBackgroundSuggestionsPanel();
  initAnatomyPanel();
  initAvatarPanel();
  saveHistory();
});

// Initialize Grid Panel
function initGridPanel() {
  const gridTypeButtons = document.querySelectorAll('.grid-type-btn');
  const gridSizeSlider = document.getElementById('gridSizeSlider');
  const gridLineWidthSlider = document.getElementById('gridLineWidthSlider');
  const gridOpacitySlider = document.getElementById('gridOpacitySlider');
  const gridColorPicker = document.getElementById('gridColorPicker');
  const gridEnableBtn = document.getElementById('gridEnableCheckbox');
  const gridSnapBtn = document.getElementById('gridSnapCheckbox');
  const gridPreview = document.getElementById('gridPreview');

  const updateGridPreview = () => {
    const pCtx = gridPreview.getContext('2d');
    pCtx.fillStyle = '#000';
    pCtx.fillRect(0, 0, gridPreview.width, gridPreview.height);
    pCtx.strokeStyle = gridColor;
    pCtx.globalAlpha = gridOpacity;
    pCtx.lineWidth = gridLineWidth;
    const gap = gridGap / 2;
    
    if(gridType === 'square'){
      for(let x=0;x<gridPreview.width;x+=gap){pCtx.beginPath();pCtx.moveTo(x,0);pCtx.lineTo(x,gridPreview.height);pCtx.stroke();}
      for(let y=0;y<gridPreview.height;y+=gap){pCtx.beginPath();pCtx.moveTo(0,y);pCtx.lineTo(gridPreview.width,y);pCtx.stroke();}
    } else if(gridType === 'dot'){
      pCtx.fillStyle = gridColor;
      for(let x=0;x<gridPreview.width;x+=gap){
        for(let y=0;y<gridPreview.height;y+=gap){
          pCtx.beginPath();
          pCtx.arc(x,y,gridLineWidth,0,2*Math.PI);
          pCtx.fill();
        }
      }
    }
    pCtx.globalAlpha = 1;
  };

  gridTypeButtons.forEach(btn => {
    btn.addEventListener('click', e => {
      gridType = e.target.dataset.grid;
      gridTypeButtons.forEach(b => b.classList.toggle('active', b.dataset.grid === gridType));
      drawBackgroundGrid();
      updateGridPreview();
    });
  });

  if(gridSizeSlider) gridSizeSlider.oninput = e => {
    gridGap = +e.target.value;
    drawBackgroundGrid();
    updateGridPreview();
  };

  if(gridLineWidthSlider) gridLineWidthSlider.oninput = e => {
    gridLineWidth = +e.target.value;
    drawBackgroundGrid();
    updateGridPreview();
  };

  if(gridOpacitySlider) gridOpacitySlider.oninput = e => {
    gridOpacity = +e.target.value / 100;
    drawBackgroundGrid();
    updateGridPreview();
  };

  if(gridColorPicker) gridColorPicker.oninput = e => {
    gridColor = e.target.value;
    drawBackgroundGrid();
    updateGridPreview();
  };

  if(gridEnableBtn) {
    gridEnableBtn.onclick = () => {
      gridEnabled = !gridEnabled;
      gridEnableBtn.classList.toggle('active', gridEnabled);
      gridEnableBtn.dataset.state = gridEnabled;
      gridEnableBtn.querySelector('.toggle-label').textContent = gridEnabled ? 'ON' : 'OFF';
      drawBackgroundGrid();
    };
  };

  if(gridSnapBtn) {
    gridSnapBtn.onclick = () => {
      gridSnapEnabled = !gridSnapEnabled;
      gridSnapBtn.classList.toggle('active', gridSnapEnabled);
      gridSnapBtn.dataset.state = gridSnapEnabled;
      gridSnapBtn.querySelector('.toggle-label').textContent = gridSnapEnabled ? 'ON' : 'OFF';
    };
  };

  // Set initial states
  if(gridEnableBtn) {
    gridEnableBtn.classList.toggle('active', gridEnabled);
    gridEnableBtn.querySelector('.toggle-label').textContent = gridEnabled ? 'ON' : 'OFF';
  }
  if(gridSnapBtn) {
    gridSnapBtn.classList.toggle('active', gridSnapEnabled);
    gridSnapBtn.querySelector('.toggle-label').textContent = gridSnapEnabled ? 'ON' : 'OFF';
  }

  updateGridPreview();
}

// Initialize Guidelines Panel
function initGuidelinesPanel() {
  const addGuidelineBtn = document.getElementById('addGuidelineBtn');
  const clearGuidelinesBtn = document.getElementById('clearGuidelinesBtn');
  const guidelineType = document.getElementById('guidelineType');
  const guidelinePosition = document.getElementById('guidelinePosition');
  const guidelineAngle = document.getElementById('guidelineAngle');
  const guidelineColorPicker = document.getElementById('guidelineColorPicker');
  const guidelineOpacitySlider = document.getElementById('guidelineOpacitySlider');
  const guidelineSnapBtn = document.getElementById('guidelineSnapCheckbox');
  const guidelinesList = document.getElementById('guidelinesList');

  const renderGuidelinesList = () => {
    guidelinesList.innerHTML = '';
    guidelines.forEach((g, i) => {
      const div = document.createElement('div');
      div.innerHTML = `<span>${g.type} @ ${g.position}px${g.angle ? ' (' + g.angle + '°)' : ''}</span>`;
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '✕';
      deleteBtn.onclick = () => {
        guidelines.splice(i, 1);
        drawBackgroundGrid();
        renderGuidelinesList();
      };
      div.appendChild(deleteBtn);
      guidelinesList.appendChild(div);
    });
  };

  if(addGuidelineBtn) {
    addGuidelineBtn.onclick = () => {
      const type = guidelineType.value;
      const pos = +guidelinePosition.value;
      const angle = type === 'diagonal' ? +guidelineAngle.value : 0;
      guidelines.push({id: nextGuidelineId++, type, position: pos, angle, color: guidelineColorPicker.value, opacity: +guidelineOpacitySlider.value / 100});
      drawBackgroundGrid();
      renderGuidelinesList();
    };
  }

  if(clearGuidelinesBtn) {
    clearGuidelinesBtn.onclick = () => {
      if(confirm('Clear all guidelines?')){
        guidelines = [];
        nextGuidelineId = 0;
        drawBackgroundGrid();
        renderGuidelinesList();
      }
    };
  }

  if(guidelineColorPicker) {
    guidelineColorPicker.oninput = e => {
      guidelineColor = e.target.value;
      drawBackgroundGrid();
    };
  }

  if(guidelineOpacitySlider) {
    guidelineOpacitySlider.oninput = e => {
      guidelineOpacity = +e.target.value / 100;
      drawBackgroundGrid();
    };
  }

  if(guidelineSnapBtn) {
    guidelineSnapBtn.onclick = () => {
      guidelineSnapEnabled = !guidelineSnapEnabled;
      guidelineSnapBtn.classList.toggle('active', guidelineSnapEnabled);
      guidelineSnapBtn.dataset.state = guidelineSnapEnabled;
      guidelineSnapBtn.querySelector('.toggle-label').textContent = guidelineSnapEnabled ? 'ON' : 'OFF';
    };
  };

  // Set initial state
  if(guidelineSnapBtn) {
    guidelineSnapBtn.classList.toggle('active', guidelineSnapEnabled);
  }

  renderGuidelinesList();
}

// Initialize Collaboration Panel
function initCollaborationPanel() {
  const collabToggleBtn = document.getElementById('collaborationOptions');
  if(collabToggleBtn) {
    collabToggleBtn.onclick = () => {
      const collabPanel = document.querySelector('.collaboration-panel-section .panel-body');
      if(collabPanel) {
        collabPanel.style.display = collabPanel.style.display === 'none' ? 'block' : 'none';
      }
    };
  }

  // Chat functionality
  const chatSendBtn = document.getElementById('chatSend');
  const chatInput = document.getElementById('chatInput');
  if(chatSendBtn && chatInput) {
    chatSendBtn.onclick = () => {
      const msg = chatInput.value.trim();
      if(!msg) return;
      const p = document.createElement('div');
      p.className = 'chat-message';
      p.innerHTML = `<span class="chat-author">You:</span><span class="chat-text">${msg}</span>`;
      const chatOutput = document.getElementById('chatOutput');
      if(chatOutput) {
        chatOutput.appendChild(p);
        chatOutput.scrollTop = chatOutput.scrollHeight;
      }
      chatInput.value = '';
    };

    chatInput.addEventListener('keypress', e => {
      if(e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatSendBtn.click();
      }
    });
  }

  // Invite Collaborator
  const inviteCollabBtn = document.getElementById('inviteCollabBtn');
  if(inviteCollabBtn) {
    inviteCollabBtn.onclick = () => {
      const link = prompt('Share this link with collaborators:', 'https://drawing-app.local/share?id=abc123');
      if(link) {
        const msg = `📎 Invite link shared: ${link}`;
        const p = document.createElement('div');
        p.className = 'chat-message';
        p.innerHTML = `<span class="chat-author">System:</span><span class="chat-text">${msg}</span>`;
        const chatOutput = document.getElementById('chatOutput');
        if(chatOutput) chatOutput.appendChild(p);
      }
    };
  }

  // View History
  const viewHistoryBtn = document.getElementById('viewHistoryBtn');
  if(viewHistoryBtn) {
    viewHistoryBtn.onclick = () => {
      alert('📋 Version History\n\n✅ Features coming soon:\n- Revert to previous states\n- Track changes over time\n- Compare versions');
    };
  }

  // Ping Area
  const pingAreaBtn = document.getElementById('pingAreaBtn');
  if(pingAreaBtn) {
    pingAreaBtn.onclick = () => {
      alert('📍 Ping Mode Active\n\nClick on the canvas to highlight an area for other collaborators to review.');
    };
  }

  // Export Log
  const exportLogBtn = document.getElementById('exportLogBtn');
  if(exportLogBtn) {
    exportLogBtn.onclick = () => {
      const chatOutput = document.getElementById('chatOutput');
      if(chatOutput) {
        const log = chatOutput.innerText;
        const blob = new Blob([log], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'collaboration-log.txt';
        a.click();
        URL.revokeObjectURL(url);
      }
    };
  }
}

window.addEventListener('resize',resize);
