const image = document.getElementById("image");
const cropPoints = document.querySelectorAll(".crop-point");
const cropArea = document.getElementById("crop-area");
const cropCoords = document.getElementById("crop-coords");
const cropped = document.getElementById("cropped");
const imageUpload = document.getElementById("image-upload");
const aspectRatioContainer = document.getElementById("aspect-ratio-container");
const aspectRatioSlider = document.getElementById("aspect-ratio-slider");
const pointRadius = cropPoints[0].clientWidth / 2;

let isDragging;
let selectedPoint;
let initialX;
let initialY;
let aspectRatio;
let croppedWidth;
let croppedHeight;

var Module = { onRuntimeInitialized() { document.getElementById("crop-button").value = "Crop" } };

document.querySelectorAll("#images-container>*").forEach(imageContainer => imageContainer.style.maxHeight = imageContainer.clientHeight + "px");

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
    image.src = URL.createObjectURL(event.target.files[0]);
}

function imageOnLoad(event) {
    URL.revokeObjectURL(event.target.src);
    aspectRatioContainer.style.visibility = "hidden";
    cropped.style.visibility = "hidden";
    cropArea.setAttribute("width", image.clientWidth);
    cropArea.setAttribute("height", image.clientHeight);
    resetCropPoints();
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
    const fullImage = document.createElement("img");
    fullImage.onload = fullImageOnLoad;
    fullImage.src = URL.createObjectURL(event.target[0].files[0]);
};

function fullImageOnLoad(event) {
    const fullImage = event.target;
    URL.revokeObjectURL(fullImage.src);
    const mat = cv.imread(fullImage);
    const scaleRatio = (mat.cols + mat.rows) / (image.clientWidth + image.clientHeight);
    const points = cropCoords.getAttribute("points").split(/[\s,]/).map(value => scaleRatio * parseFloat(value));
    const source = cv.matFromArray(4, 2, cv.CV_32FC1, points);
    const w1 = Math.sqrt(Math.pow(points[0] - points[2], 2) + Math.pow(points[1] - points[3], 2));
    const w2 = Math.sqrt(Math.pow(points[4] - points[6], 2) + Math.pow(points[5] - points[7], 2));
    const h1 = Math.sqrt(Math.pow(points[2] - points[4], 2) + Math.pow(points[3] - points[5], 2));
    const h2 = Math.sqrt(Math.pow(points[0] - points[6], 2) + Math.pow(points[1] - points[7], 2));
    aspectRatio = (w1 + w2) / (h1 + h2);
    aspectRatioContainer.style.visibility = "visible";
    aspectRatioSlider.value = 100 * aspectRatio;
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
    const croppedUrl = URL.createObjectURL(blob);
    cropped.onload = croppedOnLoad;
    cropped.src = croppedUrl;
}

function croppedOnLoad() {
    URL.revokeObjectURL(cropped.src);
    cropped.style.visibility = "visible";
    croppedWidth = cropped.clientWidth;
    croppedHeight = cropped.clientHeight;
}

// aspectRatioSlider.addEventListener("input", () => {
//     aspectRatio = aspectRatioSlider.value / 100;
//     const w = aspectRatio < 1 ? croppedHeight * aspectRatio : croppedWidth;
//     const h = aspectRatio < 1 ? croppedHeight : croppedWidth / aspectRatio;
//     cropped.style.width = w + "px";
//     cropped.style.height = h + "px";
// });

// aspectRatioSlider.onchange = () => {
//     cropped.style.width = "";
//     cropped.style.height = "";
// };