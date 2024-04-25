const imageContainers = document.querySelectorAll("#images-container>*");
const image = document.getElementById("image");
const cropPoints = document.querySelectorAll(".crop-point");
const cropArea = document.getElementById("crop-area");
const cropCoords = document.getElementById("crop-coords");
const cropped = document.getElementById("cropped");
const imageUpload = document.getElementById("image-upload");
const aspectRatioContainer = document.getElementById("aspect-ratio-container");
const aspectRatioSlider = document.getElementById("aspect-ratio-slider");

const croppedMaxWidth = imageContainers[0].clientWidth;
const croppedMaxHeight = imageContainers[0].clientHeight;
const pointRadius = cropPoints[0].clientWidth / 2;

let isDragging;
let selectedPoint;
let initialX;
let initialY;
let aspectRatio;
let fullImage = document.createElement("img");

var Module = { onRuntimeInitialized() { document.getElementById("crop-button").value = "Crop" } };

imageContainers.forEach(imageContainer => imageContainer.style.maxHeight = croppedMaxHeight + "px");

fullImage.onload = () => { URL.revokeObjectURL(fullImage.src) };

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

function resetCropPoints() {
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

imageUpload.onclick = resetCropPoints;
imageUpload.onchange = (event) => {
    image.onload = imageOnLoad;
    image.src = URL.createObjectURL(event.target.files[0]); // TODO: reduce as much as possible similar to cropped (image/webp blob from canvas)
}

function imageOnLoad() {
    fullImage.src = image.src;
    cropArea.setAttribute("width", image.clientWidth);
    cropArea.setAttribute("height", image.clientHeight);
    resetCropPoints();
    cropped.style.visibility = "hidden";
    aspectRatioContainer.style.visibility = "hidden";
}

function handleStart(event) {
    event.preventDefault();
    isDragging = true;
    selectedPoint = event.target;
    if (event.type == "touchstart") event = event.touches[0];
    initialX = event.clientX - selectedPoint.offsetLeft;
    initialY = event.clientY - selectedPoint.offsetTop;
}

cropPoints.forEach(point => {
    point.onmousedown = handleStart;
    point.ontouchstart = handleStart;
});

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

document.onmousemove = handleMove;
document.ontouchmove = handleMove;

document.onmouseup = () => { isDragging = false };
document.ontouchend = () => { isDragging = false };

document.getElementById("image-form").onsubmit = (event) => {
    event.preventDefault();
    cropImage(false);
};

function setAspectRatio(points) {
    const w1 = Math.sqrt(Math.pow(points[0] - points[2], 2) + Math.pow(points[1] - points[3], 2));
    const w2 = Math.sqrt(Math.pow(points[4] - points[6], 2) + Math.pow(points[5] - points[7], 2));
    const h1 = Math.sqrt(Math.pow(points[2] - points[4], 2) + Math.pow(points[3] - points[5], 2));
    const h2 = Math.sqrt(Math.pow(points[0] - points[6], 2) + Math.pow(points[1] - points[7], 2));
    aspectRatio = (w1 + w2) / (h1 + h2);
    if (aspectRatio > 1) aspectRatioSlider.value = ((aspectRatio - 1) / 5 + 1) * 100;
    else aspectRatioSlider.value = aspectRatio * 100;
}

function cropImage(aspectRatioIsSet) {
    const mat = cv.imread(fullImage);
    const scaleRatio = (mat.cols + mat.rows) / (image.clientWidth + image.clientHeight);
    const points = cropCoords.getAttribute("points").split(/[\s,]/).map(value => scaleRatio * parseFloat(value));
    const source = cv.matFromArray(4, 2, cv.CV_32FC1, points);
    if (!aspectRatioIsSet) setAspectRatio(points);
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
}

function canvasToBlob(blob) {
    cropped.onload = croppedOnLoad;
    cropped.style.width = "";
    cropped.style.height = "";
    cropped.src = URL.createObjectURL(blob);
}

function croppedOnLoad() {
    URL.revokeObjectURL(cropped.src);
    aspectRatioContainer.style.visibility = "visible";
    cropped.style.visibility = "visible";
}

aspectRatioSlider.addEventListener("input", () => {
    aspectRatio = aspectRatioSlider.value / 100;
    if (aspectRatio > 1) aspectRatio = (aspectRatio - 1) * 5 + 1
    cropped.style.width = (aspectRatio < 1 ? croppedMaxHeight * aspectRatio : croppedMaxWidth) + "px";
    cropped.style.height = (aspectRatio < 1 ? croppedMaxHeight : croppedMaxWidth / aspectRatio) + "px";
});

aspectRatioSlider.onchange = () => { cropImage(true) };