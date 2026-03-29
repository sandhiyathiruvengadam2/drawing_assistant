const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#000000";
ctx.lineWidth = 4;
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.strokeStyle = ctx.fillStyle;
const paperSizes = {
    A4: { width: 800, height: 500 },
    A3: { width: 1000, height: 700 },
    A5: { width: 600, height: 400 }
};
let referenceImage=null;
let drawing = false;
let lastX = 0;
let lastY = 0;
let showGrid = false;
let canvasShape = "rectangle";
// Mouse events
canvas.addEventListener("mousedown", (e) => {
    drawing = true;
    lastX = e.offsetX;
    lastY = e.offsetY;
});
canvas.addEventListener("mouseup", () => drawing = false);
canvas.addEventListener("mousemove", draw);

function draw(e) {
    if (!drawing) return;

    ctx.save(); // save normal state

    // Apply shape restriction
    if (canvasShape === "circle") {
        ctx.beginPath();
        ctx.arc(
            canvas.width / 2,
            canvas.height / 2,
            Math.min(canvas.width, canvas.height) / 2 - 10,
            0,
            Math.PI * 2
        );
        ctx.clip();
    }

    if (canvasShape === "square") {
        const size = Math.min(canvas.width, canvas.height) - 20;
        const x = (canvas.width - size) / 2;
        const y = (canvas.height - size) / 2;
        ctx.beginPath();
        ctx.rect(x, y, size, size);
        ctx.clip();
    }

    // Draw smooth line
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();

    ctx.restore(); // restore normal state

    lastX = e.offsetX;
    lastY = e.offsetY;
}
function changePaperSize(type) {
    const size = paperSizes[type];

    canvas.width = size.width;
    canvas.height = size.height;

    redrawCanvas(); 
}
function changeCanvasSize(size) {
    if (size === "small") {
        canvas.width = 400;
        canvas.height = 300;
    } else if (size === "large") {
        canvas.width = 1000;
        canvas.height = 700;
    } else {
        canvas.width = 800;
        canvas.height = 500;
    }
    redrawCanvas();
}
function setCanvasSize(w, h) {
  canvas.width = w;
  canvas.height = h;
  redrawCanvas();
}

function applyCustomSize() {
  const w = document.getElementById("customWidth").value;
  const h = document.getElementById("customHeight").value;

  if (w > 0 && h > 0) {
    setCanvasSize(w, h);
  }
}
function changeCanvasShape(shape) {
    canvasShape = shape;
    redrawCanvas();
}
// Clear canvas
function clearCanvas() {
    redrawCanvas();
}
function toggleGrid() {
    showGrid = !showGrid;
    redrawCanvas();
}

function drawGrid() {
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;

    const gap = 50;

    for (let x = 0; x <= canvas.width; x += gap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += gap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ---- CLIP AREA (drawing limit) ----
    ctx.save();

    if (canvasShape === "circle") {
        ctx.beginPath();
        ctx.arc(
            canvas.width / 2,
            canvas.height / 2,
            Math.min(canvas.width, canvas.height) / 2 - 10,
            0,
            Math.PI * 2
        );
        ctx.clip();
    }

    if (canvasShape === "square") {
        const size = Math.min(canvas.width, canvas.height) - 20;
        const x = (canvas.width - size) / 2;
        const y = (canvas.height - size) / 2;
        ctx.beginPath();
        ctx.rect(x, y, size, size);
        ctx.clip();
    }

    // Draw inside clipped area
    if (referenceImage) {
        ctx.drawImage(referenceImage, 0, 0, canvas.width, canvas.height);
    }

    if (showGrid) {
        drawGrid();
    }

    ctx.restore(); // 🔴 VERY IMPORTANT

    // ---- DRAW VISIBLE BORDER (artist guide) ----
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 3;

    if (canvasShape === "circle") {
        ctx.beginPath();
        ctx.arc(
            canvas.width / 2,
            canvas.height / 2,
            Math.min(canvas.width, canvas.height) / 2 - 10,
            0,
            Math.PI * 2
        );
        ctx.stroke();
    }

    if (canvasShape === "square") {
        const size = Math.min(canvas.width, canvas.height) - 20;
        const x = (canvas.width - size) / 2;
        const y = (canvas.height - size) / 2;
        ctx.strokeRect(x, y, size, size);
    }
}
function saveDrawing() {
    const imageData = canvas.toDataURL("image/png");

    fetch("/save", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "image=" + encodeURIComponent(imageData)
    })
    .then(response => response.text())
    .then(msg =>alert(msg));
}

function loadDrawing() {
    fetch("/load")
        .then(res => res.text())
        .then(data => {
            if (!data) return;

            const img = new Image();
            img.onload = () => {
                referenceImage = img;
                redrawCanvas();
            };
            img.src = "data:image/png;base64," + data;
});
}

function changeBackground(type) {
    if (type === "portrait") {
        canvas.style.background = "linear-gradient(#f0f0f0, #dcdcdc)";
    } else if (type === "character") {
        canvas.style.background = "#e6e6fa";
    } else if (type === "nature") {
        canvas.style.background = "linear-gradient(#a8e063, #56ab2f)";
    } else {
        canvas.style.background = "white";
}
}

function applyShade(type) {
    const picker = document.getElementById("colorPicker");
    let baseColor = picker.value;

    let r = parseInt(baseColor.substr(1, 2), 16);
    let g = parseInt(baseColor.substr(3, 2), 16);
    let b = parseInt(baseColor.substr(5, 2), 16);

    if (type === "light") {
        r = Math.min(r + 40, 255);
        g = Math.min(g + 40, 255);
        b = Math.min(b + 40, 255);
    } 
    else if (type === "dark") {
        r = Math.max(r - 40, 0);
        g = Math.max(g - 40, 0);
        b = Math.max(b - 40, 0);
    }
    // mid = no change

    const shadedColor = `rgb(${r}, ${g}, ${b})`;
    ctx.fillStyle = shadedColor;

    console.log("Shade applied:",shadedColor);
}

function loadReferenceImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    referenceImage = new Image();
    referenceImage.onload = function () {
        redrawCanvas();
    };
    referenceImage.src = URL.createObjectURL(file);
}

document.getElementById("colorPicker").addEventListener("input", function () {
    ctx.fillStyle =this.value;
});
