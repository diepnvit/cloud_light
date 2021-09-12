var app = angular.module('fileUpload', ['ngFileUpload']);

app.controller('MyCtrl', ['$scope', 'Upload', '$timeout', '$http', function ($scope, Upload, $timeout, $http) {
    $scope.$watch('files', function () {
        $scope.upload($scope.files);
    });
    $scope.log = '';

    var canvas = this.__canvas = new fabric.Canvas('canvas', {
        selection: false,
        allowTouchScrolling: isTouchScreen()
    });
    var points = [{
        "x": 203,
        "y": 285
    }, {
        "x": 206,
        "y": 758
    }, {
        "x": 555,
        "y": 763
    }, {
        "x": 683,
        "y": 0
    }];
    var rotateThisImage;
    var img;
    let urlToPy = 'https://788a-1-54-152-38.ngrok.io/';
    $scope.isDoneCustom = false;
    $scope.textRecog = '';
    $scope.isLoading = false;
    $scope.numRotate = 0;
    $scope.upload = function (files) {
        if (files && files.length) {
            var file = files[0];
            var reader = new FileReader();
            reader.onload = function (e) {
                $scope.imageDisplay = e.target.result;
                img = new Image();
                img.onload = function () {

                    canvas.setDimensions({
                        width: img.width,
                        height: img.height
                    }, {
                        backstoreOnly: true,
                    })
                    setImageCanvaas(img);
                }
                img.src = e.target.result;
            }
            reader.readAsDataURL(file);
        }
    };

    $scope.getDataCoor = function () {
        var obj = canvas.getActiveObject();
        console.log(obj.points);
    }

    $scope.rotateImage = function (type) {
        var curAngle = rotateThisImage.angle;

        if (type === 'left') {
            rotateThisImage.angle = curAngle > 0 ? curAngle - 90 : 270;
        } else {
            rotateThisImage.angle = curAngle + 90;
        }
        if (curAngle > 270) {
            rotateThisImage.angle = 0;
        } else if (curAngle < 0) {
            rotateThisImage.angle = 270;
        }
        $scope.numRotate = rotateThisImage.angle;
        canvas.setDimensions({
            height: rotateThisImage.angle == 0 || rotateThisImage.angle == 180 ? img.height : img.width,
            width: rotateThisImage.angle == 0 || rotateThisImage.angle == 180 ? img.width : img.height
        }, {
            backstoreOnly: true,
        })
        setImageCanvaas(img);
        // canvas.setWidth(rotateThisImage.angle == 0 || rotateThisImage.angle == 180 ? img.width : img.height);
        // canvas.setHeight(rotateThisImage.angle == 0 || rotateThisImage.angle == 180 ? img.height : img.width);
        // canvas.calcOffset();
        setTimeout(() => {
            canvas.centerObject(rotateThisImage);
            canvas.setActiveObject(rotateThisImage);
            canvas.renderAll();
        }, 1000);


        // img.width = rotateThisImage.angle == 0 || rotateThisImage.angle == 180 ? img.width : img.height;
        // img.height = rotateThisImage.angle == 0 || rotateThisImage.angle == 180 ? img.height : img.width;

    }

    $scope.add4Corner = function () {
        canvas.remove(...canvas.getObjects());
        // canvas.setDimensions({
        //     width: rotateThisImage.angle == 90 || rotateThisImage.angle == 270 ? img.height : img.width,
        //     height: rotateThisImage.angle == 0 || rotateThisImage.angle == 180 ? img.width : img.height
        // }, {
        //     backstoreOnly: true,
        // })
        setImageCanvaas(img);
        getCoordinates($scope.files[0]);
    }

    $scope.handleRecog = function () {
        $scope.isLoading = true;
        var poly = canvas.getObjects()[1];
        console.log(poly.points);
        var fd = new FormData();
        fd.append('file', $scope.files[0]);
        fd.append('coor', JSON.stringify(poly.points));
        fd.append('rotate', rotateThisImage.angle);
        $http.post(urlToPy + 'recog', fd, {
            transformRequest: angular.identity,
            headers: {
                'Content-Type': undefined
            }
        }).then(function (response) {
            $scope.textRecog = response.data.text;
            $scope.isLoading = false;
            // $scope.textRecog.replaceAll(/\\r\\n/g, "<br />");
            $('.text-reg').html($scope.textRecog);    
            $('#exampleModalCenter').modal('show');
            $('.img-reg').css({'transform': 'rotate(' + $scope.numRotate + 'deg)', 'width': '90%', 'height': '90%'})
        })
    }

    function getCoordinates(file) {
        $scope.isLoading = true;
        var fd = new FormData();
        fd.append('file', file);
        fd.append('rotate', rotateThisImage.angle);
        $http.post(urlToPy, fd, {
            transformRequest: angular.identity,
            headers: {
                'Content-Type': undefined
            }
        }).then(function (response) {
            points = response.data.coor;
            setupPolygon();
            setEditable();
            $scope.isDoneCustom = true;
            $scope.isLoading = false;
        })
    }

    function setEditable() {
        var poly = canvas.getObjects()[1];
        canvas.setActiveObject(poly);
        var lastControl = poly.points.length - 1;
        poly.cornerStyle = 'circle';
        poly.cornerColor = 'rgba(0,0,255,0.5)';
        poly.controls = poly.points.reduce(function (acc, point, index) {
            acc['p' + index] = new fabric.Control({
                positionHandler: polygonPositionHandler,
                actionHandler: anchorWrapper(index > 0 ? index - 1 : lastControl, actionHandler),
                actionName: 'modifyPolygon',
                pointIndex: index
            });
            return acc;
        }, {});
        poly.hasBorders = true;
        canvas.requestRenderAll();
    }
    // define a function that can locate the controls.
    // this function will be used both for drawing and for interaction.
    function polygonPositionHandler(dim, finalMatrix, fabricObject) {
        var x = (fabricObject.points[this.pointIndex].x - fabricObject.pathOffset.x),
            y = (fabricObject.points[this.pointIndex].y - fabricObject.pathOffset.y);
        return fabric.util.transformPoint({
                x: x,
                y: y
            },
            fabric.util.multiplyTransformMatrices(
                fabricObject.canvas.viewportTransform,
                fabricObject.calcTransformMatrix()
            )
        );
    }

    // define a function that will define what the control does
    // this function will be called on every mouse move after a control has been
    // clicked and is being dragged.
    // The function receive as argument the mouse event, the current trasnform object
    // and the current position in canvas coordinate
    // transform.target is a reference to the current object being transformed,
    function actionHandler(eventData, transform, x, y) {
        var polygon = transform.target,
            currentControl = polygon.controls[polygon.__corner],
            mouseLocalPosition = polygon.toLocalPoint(new fabric.Point(x, y), 'center', 'center'),
            polygonBaseSize = polygon._getNonTransformedDimensions(),
            size = polygon._getTransformedDimensions(0, 0),
            finalPointPosition = {
                x: mouseLocalPosition.x * polygonBaseSize.x / size.x + polygon.pathOffset.x,
                y: mouseLocalPosition.y * polygonBaseSize.y / size.y + polygon.pathOffset.y
            };
        polygon.points[currentControl.pointIndex] = finalPointPosition;
        return true;
    }

    // define a function that can keep the polygon in the same position when we change its
    // width/height/top/left.
    function anchorWrapper(anchorIndex, fn) {
        return function (eventData, transform, x, y) {
            var fabricObject = transform.target,
                absolutePoint = fabric.util.transformPoint({
                    x: (fabricObject.points[anchorIndex].x - fabricObject.pathOffset.x),
                    y: (fabricObject.points[anchorIndex].y - fabricObject.pathOffset.y),
                }, fabricObject.calcTransformMatrix()),
                actionPerformed = fn(eventData, transform, x, y),
                newDim = fabricObject._setPositionDimensions({}),
                polygonBaseSize = fabricObject._getNonTransformedDimensions(),
                newX = (fabricObject.points[anchorIndex].x - fabricObject.pathOffset.x) / polygonBaseSize.x,
                newY = (fabricObject.points[anchorIndex].y - fabricObject.pathOffset.y) / polygonBaseSize.y;
            fabricObject.setPositionByOrigin(absolutePoint, newX + 0.5, newY + 0.5);
            return actionPerformed;
        }
    }

    function setImageCanvaas(pugImg0) {

        var pug = new fabric.Image(pugImg0, {
            // left: 100,
            // top: 50,
            // scaleX: 1,
            // scaleY: 1,
            selectable: true,
            lockMovementX: true,
            lockMovementY: true,
            hasControls: false,
            angle: rotateThisImage && rotateThisImage.angle ? rotateThisImage.angle : 0
        });
        let imgWidth = pugImg0.width;
        let imgHeight = pugImg0.height;
        let canvasWidth = canvas.getWidth();
        let canvasHeight = canvas.getHeight();

        let imgRatio = imgWidth / imgHeight;
        let canvasRatio = canvasWidth / canvasHeight;
        if (imgRatio <= canvasRatio) {
            if (imgHeight > canvasHeight) {
                pug.scaleToHeight(canvasHeight);
            }
            if (imgWidth > canvasWidth) {
                pug.scaleToWidth(canvasWidth);
            }
        } else {
            if (imgWidth > canvasWidth) {
                pug.scaleToWidth(canvasWidth);
            }
        }
        canvas.add(pug);
        canvas.centerObject(pug);
        canvas.setActiveObject(pug);
        canvas.renderAll();
        rotateThisImage = pug;
    }

    function setupPolygon() {
        var polygon = new fabric.Polygon(points, {
            // left: 340,
            // top: 0,
            fill: 'rgba(0,0,0,0)',
            strokeWidth: 5,
            stroke: 'red',
            originX: "center",
            originY: "center",
            objectCaching: false,
            transparentCorners: false,
            cornerColor: 'blue',
            cornerSize: 20,
            // scaleX: 0.5,
            // scaleY: 0.5,
        });
        // canvas.viewportTransform = [0.7, 0, 0, 0.7, -50, 50];
        canvas.add(polygon).renderAll();
    }

    function isTouchScreen() {
        // Detect if the user's device has a touchscreen
        // Taken from here - https://developer.mozilla.org/en-US/docs/Web/HTTP/Browser_detection_using_the_user_agent#Mobile_Device_Detection
        if ("maxTouchPoints" in navigator) {
            return navigator.maxTouchPoints > 0;
        } else if ("msMaxTouchPoints" in navigator) {
            return navigator.msMaxTouchPoints > 0;
        } else {
            var mQ = window.matchMedia && matchMedia("(pointer:coarse)");
            if (mQ && mQ.media === "(pointer:coarse)") {
                return !!mQ.matches;
            } else if ("orientation" in window) {
                return true; // deprecated, but good fallback
            } else {
                // Only as a last resort, fall back to user agent sniffing
                var UA = navigator.userAgent;
                return (
                    /\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA) ||
                    /\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA)
                );
            }
        }
    }
}]);