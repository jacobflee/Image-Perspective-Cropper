const imageContainers = document.querySelectorAll("#images-container>*");
const image = document.getElementById("image");
const cropPoints = document.querySelectorAll(".crop-point");
const cropArea = document.getElementById("crop-area");
const cropCoords = document.getElementById("crop-coords");
const cropped = document.getElementById("cropped");
const imageUpload = document.getElementById("image-upload");
const pointRadius = cropPoints[0].clientWidth / 2;

let isDragging = false;
let isCropPoint;
let selectedPoint;
let initialX;
let initialY;

var Module = { onRuntimeInitialized() { document.getElementById("cropButton").value = "Crop" } };

imageContainers.forEach(imageContainer => imageContainer.style.maxHeight = imageContainer.clientHeight + "px");

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
    const cropWidth = image.clientWidth / 3;
    const cropHeight = image.clientHeight / 3;
    let left = image.offsetLeft - pointRadius + cropWidth;
    let top = image.offsetTop - pointRadius + cropHeight;
    for (let i = 0; i < 4; i++) {
        cropPoints[i].style.left = left + "px";
        cropPoints[i].style.top = top + "px";
        if (i == 0) left += cropWidth;
        else if (i == 1) top += cropHeight;
        else if (i == 2) left -= cropWidth;
    }
    drawCropArea();
}

image.onload = () => {
    cropped.style.visibility = "hidden";
    cropPoints.forEach(point => point.style.visibility = "visible");
    cropArea.setAttribute("width", image.clientWidth);
    cropArea.setAttribute("height", image.clientHeight);
    resetCropPoints();
};

imageUpload.onclick = resetCropPoints;
imageUpload.onchange = (event) => image.src = URL.createObjectURL(event.target.files[0]);

cropped.onload = () => cropped.style.visibility = "visible";

function handleStart(event, point) {
    event.preventDefault();
    isDragging = true;
    isCropPoint = point.className == "crop-point";
    selectedPoint = point;
    if (event.type == "touchstart") event = event.touches[0];
    initialX = event.clientX - point.offsetLeft;
    initialY = event.clientY - point.offsetTop;
}

cropPoints.forEach(point => {
    point.onmousedown = (event) => handleStart(event, point);
    point.ontouchstart = (event) => handleStart(event, point);
});

function handleMove(event) {
    if (!isDragging) return;
    const newX = event.clientX - initialX;
    const newY = event.clientY - initialY;
    if (isCropPoint) var selectedImage = image;
    const leftLimit = selectedImage.offsetLeft - pointRadius;
    const rightLimit = leftLimit + selectedImage.clientWidth;
    const topLimit = selectedImage.offsetTop - pointRadius;
    const bottomLimit = topLimit + selectedImage.clientHeight;
    selectedPoint.style.left = Math.max(leftLimit, Math.min(newX, rightLimit)) + "px";
    selectedPoint.style.top = Math.max(topLimit, Math.min(newY, bottomLimit)) + "px";
    if (isCropPoint) drawCropArea();
}

document.onmousemove = handleMove;
document.ontouchmove = (event) => handleMove(event.touches[0]);

document.onmouseup = () => {isDragging = false};
document.ontouchend = () => {isDragging = false};

document.getElementById("image-form").onsubmit = (event) => {
    event.preventDefault();
    const fullImage = document.createElement("img");
    fullImage.src = URL.createObjectURL(event.target[0].files[0]);
    fullImage.onload = () => {
        const mat = cv.imread(fullImage);
        const scaleRatio = (mat.cols + mat.rows) / (image.clientWidth + image.clientHeight);
        const points = cropCoords.getAttribute("points").split(/[\s,]/).map(value => scaleRatio * parseFloat(value));
        const source = cv.matFromArray(4, 2, cv.CV_32FC1, points);
        const w1 = Math.sqrt(Math.pow(points[0] - points[2], 2) + Math.pow(points[1] - points[3], 2));
        const w2 = Math.sqrt(Math.pow(points[4] - points[6], 2) + Math.pow(points[5] - points[7], 2));
        const h1 = Math.sqrt(Math.pow(points[2] - points[4], 2) + Math.pow(points[3] - points[5], 2));
        const h2 = Math.sqrt(Math.pow(points[0] - points[6], 2) + Math.pow(points[1] - points[7], 2));
        const aspectRatio = (w1 + w2) / (h1 + h2);
        if (aspectRatio < 1) {
            var w = mat.rows * aspectRatio;
            var h = mat.rows;
        } else {
            var w = mat.cols
            var h = mat.cols / aspectRatio
        }
        const destination = cv.matFromArray(4, 2, cv.CV_32FC1, [0, 0, w, 0, w, h, 0, h]);
        const transform = cv.getPerspectiveTransform(source, destination);
        source.delete();
        destination.delete();
        cv.warpPerspective(mat, mat, transform, new cv.Size(w, h));
        transform.delete();
        const canvas = document.createElement("canvas");
        cv.imshow(canvas, mat);
        mat.delete();
        cropped.src = canvas.toDataURL();
    };
};
