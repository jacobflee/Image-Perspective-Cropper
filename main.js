const imageContainers = document.querySelectorAll("#images-container>*");
const image = document.getElementById("image");
const cropArea = document.getElementById("crop-area");
const cropCoords = document.getElementById("crop-coords");
const cropPoints = document.querySelectorAll(".crop-point");
const cropped = document.getElementById("cropped");
const imageUpload = document.getElementById("image-upload");
const aspectRatioContainer = document.getElementById("aspect-ratio-container");
const aspectRatioSlider = document.getElementById("aspect-ratio-slider");

const maxWidth = imageContainers[0].clientWidth;
const maxHeight = imageContainers[0].clientHeight;
const containerAspectRatio = maxWidth / maxHeight;
const pointRadius = cropPoints[0].clientWidth / 2;

var Module = { onRuntimeInitialized() { document.getElementById("crop-button").value = "Crop" } };

let fullImage = document.createElement("img");

let isDragging;
let selectedPoint;
let initialX;
let initialY;
let aspectRatio;

// setting max height for image positioning

imageContainers.forEach(imageContainer => imageContainer.style.maxHeight = maxHeight + "px");

// handling loaders for image input

imageUpload.onclick = resetCropPoints;
imageUpload.onchange = (event) => { if (event.target.files[0]) image.src = URL.createObjectURL(event.target.files[0]) };

image.onload = () => {
    fullImage.src = image.src;
    if (cropped.src) URL.revokeObjectURL(cropped.src);
    cropped.style.visibility = "hidden";
    cropped.style.src = "";
    aspectRatioContainer.style.visibility = "hidden";
    cropArea.setAttribute("width", image.clientWidth);
    cropArea.setAttribute("height", image.clientHeight);
    resetCropPoints();
}

fullImage.onload = () => { URL.revokeObjectURL(fullImage.src) };

function resetCropPoints() {
    if (!image.src) return;
    const cropAreaWidth = image.clientWidth / 3;
    const cropAreaHeight = image.clientHeight / 3;
    let left = image.offsetLeft - pointRadius + cropAreaWidth;
    let top = image.offsetTop - pointRadius + cropAreaHeight;
    for (let i = 0; i < 4; i++) {
        cropPoints[i].style.left = left + "px";
        cropPoints[i].style.top = top + "px";
        if (i == 0) left += cropAreaWidth;
        else if (i == 1) top += cropAreaHeight;
        else if (i == 2) left -= cropAreaWidth;
    }
    drawCropArea();
}

function drawCropArea() {
    let points = "";
    cropPoints.forEach(point => {
        const x = point.offsetLeft - image.offsetLeft + pointRadius;
        const y = point.offsetTop - image.offsetTop + pointRadius;
        points += x + "," + y + " ";
    });
    points = points.trim();
    cropCoords.setAttribute("points", points);
}

// handling movement of crop points

cropPoints.forEach(point => {
    point.onmousedown = handleStart;
    point.ontouchstart = handleStart;
});

function handleStart(event) {
    event.preventDefault();
    isDragging = true;
    selectedPoint = event.target;
    if (event.type == "touchstart") event = event.touches[0];
    initialX = event.clientX - selectedPoint.offsetLeft;
    initialY = event.clientY - selectedPoint.offsetTop;
}

document.onmousemove = handleMove;
document.ontouchmove = handleMove;

function handleMove(event) {
    if (!isDragging) return;
    if (event.type == "touchmove") event = event.touches[0];
    const newX = event.clientX - initialX;
    const newY = event.clientY - initialY;
    const leftLimit = image.offsetLeft - pointRadius;
    const rightLimit = leftLimit + image.clientWidth;
    const topLimit = image.offsetTop - pointRadius;
    const bottomLimit = topLimit + image.clientHeight;
    selectedPoint.style.left = Math.max(leftLimit, Math.min(newX, rightLimit)) + "px";
    selectedPoint.style.top = Math.max(topLimit, Math.min(newY, bottomLimit)) + "px";
    drawCropArea();
}

document.onmouseup = () => { isDragging = false };
document.ontouchend = () => { isDragging = false };

// handle crop

document.getElementById("image-form").onsubmit = (event) => {
    event.preventDefault();
    const mat = cv.imread(fullImage);
    const scaleRatio = (mat.cols + mat.rows) / (image.clientWidth + image.clientHeight);
    const points = cropCoords.getAttribute("points").split(/[\s,]/).map(value => scaleRatio * parseFloat(value));
    const source = cv.matFromArray(4, 2, cv.CV_32FC1, points);
    const w1 = Math.sqrt(Math.pow(points[0] - points[2], 2) + Math.pow(points[1] - points[3], 2));
    const w2 = Math.sqrt(Math.pow(points[4] - points[6], 2) + Math.pow(points[5] - points[7], 2));
    const h1 = Math.sqrt(Math.pow(points[2] - points[4], 2) + Math.pow(points[3] - points[5], 2));
    const h2 = Math.sqrt(Math.pow(points[0] - points[6], 2) + Math.pow(points[1] - points[7], 2));
    aspectRatio = (w1 + w2) / (h1 + h2);
    if (aspectRatio < 1) aspectRatioSlider.value = (-25 / 2) * (Math.sqrt(105 - 96 * aspectRatio) - 11);
    else aspectRatioSlider.value = (25 / 2) * (Math.sqrt(24 * aspectRatio - 15) + 5);
    const w = aspectRatio < 1 ? mat.rows * aspectRatio : mat.cols;
    const h = aspectRatio < 1 ? mat.rows : mat.cols / aspectRatio;
    const destination = cv.matFromArray(4, 2, cv.CV_32FC1, [0, 0, w, 0, w, h, 0, h]);
    const transform = cv.getPerspectiveTransform(source, destination);
    source.delete();
    destination.delete();
    cv.warpPerspective(mat, mat, transform, new cv.Size(w, h));
    transform.delete();
    const canvas = document.createElement("canvas");
    cv.imshow(canvas, mat);
    mat.delete();
    canvas.toBlob(canvasToBlob, "image/webp");
};

function canvasToBlob(blob) {
    cropped.onload = croppedOnLoad;
    if (cropped.src) URL.revokeObjectURL(cropped.src);
    cropped.src = URL.createObjectURL(blob);
}

function croppedOnLoad() {
    cropped.style.width = "";
    cropped.style.height = "";
    cropped.style.visibility = "visible";
    aspectRatioContainer.style.visibility = "visible";
}

aspectRatioSlider.addEventListener("input", () => {
    if (aspectRatioSlider.value < 100) aspectRatio = (-1 / 15000) * (Math.pow(aspectRatioSlider.value, 2) - 275 * aspectRatioSlider.value + 2500);
    else aspectRatio = (1 / 3750) * (Math.pow(aspectRatioSlider.value, 2) - 125 * aspectRatioSlider.value + 6250);
    cropped.style.width = (aspectRatio < containerAspectRatio ? maxHeight * aspectRatio : maxWidth) + "px"
    cropped.style.height = (aspectRatio < containerAspectRatio ? maxHeight : maxWidth / aspectRatio) + "px"
});