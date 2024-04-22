const imageContainers = document.querySelectorAll("#images-container>*");
const image = document.getElementById("image");
const cropPoints = document.querySelectorAll(".crop-point");
const cropArea = document.getElementById("crop-area");
const cropCoords = document.getElementById("crop-coords");
const cropped = document.getElementById("cropped");
const distancePoints = document.querySelectorAll(".distance-point");
const distanceLine = document.getElementById("distance-line");
const distanceCoords = document.getElementById("distance-coords");
const imageUpload = document.getElementById("image-upload");
const physicalFeet = document.getElementById("physical-feet");
const physicalInches = document.getElementById("physical-inches");
const physicalWidth = document.getElementById("physical-width");
const physicalHeight = document.getElementById("physical-height");
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

imageUpload.onclick = resetCropPoints;

imageUpload.onchange = (event) => {
    image.src = URL.createObjectURL(event.target.files[0]);
    image.onload = () => {
        distancePoints.forEach(point => point.style.visibility = "hidden");
        cropped.style.visibility = "hidden";
        distanceLine.style.visibility = "hidden";
        physicalFeet.value = "";
        physicalInches.value = "";
        physicalWidth.innerHTML = "Width:&nbsp; ?";
        physicalHeight.innerHTML = "Height: ?";
        cropPoints.forEach(point => point.style.visibility = "visible");
        cropArea.setAttribute("width", image.clientWidth);
        cropArea.setAttribute("height", image.clientHeight);
        resetCropPoints();
    };
};

function updateDistanceInfo() {
    let totalInches = 0;
    if (physicalFeet.value) totalInches += 12 * parseFloat(physicalFeet.value);
    if (physicalInches.value) totalInches += parseFloat(physicalInches.value);
    if (!cropped.clientWidth || cropped.style.visibility == "hidden" || !totalInches) {
        physicalWidth.innerHTML = "Width:&nbsp; ?";
        physicalHeight.innerHTML = "Height: ?";
        return;
    }
    const x1 = distanceCoords.getAttribute("x1");
    const y1 = distanceCoords.getAttribute("y1");
    const x2 = distanceCoords.getAttribute("x2");
    const y2 = distanceCoords.getAttribute("y2");
    const virtualDistance = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    const ratio = totalInches / virtualDistance;
    const widthInches = Math.round(ratio * cropped.clientWidth);
    const heightInches = Math.round(ratio * cropped.clientHeight);
    physicalWidth.innerHTML = "Width:&nbsp; " + Math.floor(widthInches / 12) + "ft " + widthInches % 12 + "in";
    physicalHeight.innerHTML = "Height: " + Math.floor(heightInches / 12) + "ft " + heightInches % 12 + "in";
}

function drawLine() {
    distanceCoords.setAttribute("x1", distancePoints[0].offsetLeft - cropped.offsetLeft + pointRadius);
    distanceCoords.setAttribute("y1", distancePoints[0].offsetTop - cropped.offsetTop + pointRadius);
    distanceCoords.setAttribute("x2", distancePoints[1].offsetLeft - cropped.offsetLeft + pointRadius);
    distanceCoords.setAttribute("y2", distancePoints[1].offsetTop - cropped.offsetTop + pointRadius);
    if (physicalFeet.value == "" && physicalInches.value == "") return;
    updateDistanceInfo();
}

physicalFeet.onchange = updateDistanceInfo;
physicalInches.onchange = updateDistanceInfo;

cropped.onload = () => {
    if (cropped.style.visibility == "visible") return;
    cropped.style.visibility = "visible";
    distancePoints.forEach(point => point.style.visibility = "visible");
    distanceLine.style.visibility = "visible";
    distanceLine.setAttribute("width", cropped.clientWidth);
    distanceLine.setAttribute("height", cropped.clientHeight);
    const lineWidth = cropped.clientWidth / 3;
    let left = cropped.offsetLeft - pointRadius + lineWidth;
    const top = cropped.offsetTop - pointRadius + cropped.clientHeight / 2;
    distancePoints[0].style.left = left + "px";
    distancePoints[0].style.top = top + "px";
    left += lineWidth;
    distancePoints[1].style.left = left + "px";
    distancePoints[1].style.top = top + "px";
    drawLine();
};

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

distancePoints.forEach(point => {
    point.onmousedown = (event) => handleStart(event, point);
    point.ontouchstart = (event) => handleStart(event, point);
});

function handleMove(event) {
    if (!isDragging) return;
    const newX = event.clientX - initialX;
    const newY = event.clientY - initialY;
    if (isCropPoint) var selectedImage = image;
    else var selectedImage = cropped;
    const leftLimit = selectedImage.offsetLeft - pointRadius;
    const rightLimit = leftLimit + selectedImage.clientWidth;
    const topLimit = selectedImage.offsetTop - pointRadius;
    const bottomLimit = topLimit + selectedImage.clientHeight;
    selectedPoint.style.left = Math.max(leftLimit, Math.min(newX, rightLimit)) + "px";
    selectedPoint.style.top = Math.max(topLimit, Math.min(newY, bottomLimit)) + "px";
    if (isCropPoint) drawCropArea();
    else drawLine();
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
