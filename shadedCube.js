"use strict";

var shadedCube = function () {
  var canvas;
  var gl;

  var numPositions = 36;

  var positionsArray = [];
  var normalsArray = [];

  var vertices = [vec4(-0.1, -0.1, 0.1, 1.0), vec4(-0.1, 0.1, 0.1, 1.0), vec4(0.1, 0.1, 0.1, 1.0), vec4(0.1, -0.1, 0.1, 1.0), vec4(-0.1, -0.1, -0.1, 1.0), vec4(-0.1, 0.1, -0.1, 1.0), vec4(0.1, 0.1, -0.1, 1.0), vec4(0.1, -0.1, -0.1, 1.0)];

  var lightPosition = vec4(1.0, 1.0, 1.0, 0.0);
  var lightAmbient = vec4(0.5, 0.5, 0.5, 1.0);
  var lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
  var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);

  var materialAmbient = vec4(0.65, 0.04, 0.48, 1.0);
  var materialDiffuse = vec4(0.65, 0.04, 0.48, 1.0);
  var materialSpecular = vec4(0.9, 0.7, 0.9, 1.0);

  // ambient is the base color of the object
  // diffuse is the color of the object when light hits it
  // specular is the highlight of the object when light hits it

  // difference of lightSpecular and materialSpecular is the shininess of the material (how shiny the material is)
  // lightSpecular is the highlight of the light, materialSpecular is the highlight of the material
  
  var materialShininess = 20.0;

  var ctm;
  var ambientColor, diffuseColor, specularColor;
  var modelViewMatrix, projectionMatrix;
  var viewerPos;
  var program;

  var xAxis = 0;
  var yAxis = 1;
  var zAxis = 2;
  var axis = 0;
  var theta = vec3(0, 0, 0);

  var thetaLoc;

  var flag = false;
  var moveFlag = false;
  var translation = vec3(-1.0, 0.0, 0.0); // Start from the left
  var mass = 25; // Nilai awal massa
  var appliedForce = 0;
  var frictionCoefficient = 0.1;
  var velocity = 0;
  var acceleration = 0;
  var time = 0;
  var speedMultiplier = 1;
  var isAccelerationMode = true; // New variable to track mode

  init();

  function quad(a, b, c, d) {
    var t1 = subtract(vertices[b], vertices[a]);
    var t2 = subtract(vertices[c], vertices[b]);
    var normal = cross(t1, t2);
    normal = vec3(normal);

    positionsArray.push(vertices[a]);
    normalsArray.push(normal);
    positionsArray.push(vertices[b]);
    normalsArray.push(normal);
    positionsArray.push(vertices[c]);
    normalsArray.push(normal);
    positionsArray.push(vertices[a]);
    normalsArray.push(normal);
    positionsArray.push(vertices[c]);
    normalsArray.push(normal);
    positionsArray.push(vertices[d]);
    normalsArray.push(normal);
  }

  function colorCube() {
    quad(1, 0, 3, 2);
    quad(2, 3, 7, 6);
    quad(3, 0, 4, 7);
    quad(6, 5, 1, 2);
    quad(4, 5, 6, 7);
    quad(5, 4, 0, 1);
  }

  function init() {
    canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext("webgl2", { antialias: false });
    if (!gl) alert("WebGL 2.0 isn't available");

    var realToCSSPixels = window.devicePixelRatio || 1;
    var displayWidth  = Math.floor(canvas.clientWidth  * realToCSSPixels);
    var displayHeight = Math.floor(canvas.clientHeight * realToCSSPixels);
    canvas.width = displayWidth;
    canvas.height = displayHeight;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    colorCube();

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    var normalLoc = gl.getAttribLocation(program, "aNormal");
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalLoc);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positionsArray), gl.STATIC_DRAW);

    var positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    thetaLoc = gl.getUniformLocation(program, "theta");

    viewerPos = vec3(0.0, 0.0, -20.0);

    projectionMatrix = ortho(-1, 1, -1, 1, -10, 10);

    var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);

    document.getElementById("ButtonX").onclick = function () {
      axis = xAxis;
    };
    document.getElementById("ButtonY").onclick = function () {
      axis = yAxis;
    };
    document.getElementById("ButtonZ").onclick = function () {
      axis = zAxis;
    };
    document.getElementById("ButtonT").onclick = function () {
      flag = !flag;
    };
    document.getElementById("ButtonStart").onclick = function () {
      moveFlag = true;
      time = 0;
    };

    document.getElementById("ButtonStop").onclick = function () {
      moveFlag = false;
    };

    document.getElementById("ButtonReset").onclick = function () {
        moveFlag = false;
        translation = vec3(-1.0, 0.0, 0.0);
        velocity = 0;
        appliedForce = 0;
        time = 0;
        document.getElementById("velocityValue").textContent = velocity.toFixed(2);
        document.getElementById("accelerationValue").textContent = acceleration.toFixed(2);
        document.getElementById("timeValue").textContent = time.toFixed(2);
        // reset slider too
        document.getElementById("forceSlider").value = 0;
        document.getElementById("massSlider").value = 25;
        document.getElementById("frictionSlider").value = 0.1;
        document.getElementById("forceValue").textContent = 0;
        document.getElementById("massValue").textContent = 25;
        document.getElementById("frictionValue").textContent = 0.1;
    };

    document.getElementById("Speed0_5x").onclick = function () {
      speedMultiplier = 0.5;
    };
    document.getElementById("Speed1x").onclick = function () {
      speedMultiplier = 1;
    };
    document.getElementById("Speed1_5x").onclick = function () {
      speedMultiplier = 1.5;
    };
    document.getElementById("Speed2x").onclick = function () {
      speedMultiplier = 2;
    };

    gl.uniform4fv(gl.getUniformLocation(program, "uAmbientProduct"), ambientProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "uDiffuseProduct"), diffuseProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "uSpecularProduct"), specularProduct);
    gl.uniform4fv(gl.getUniformLocation(program, "uLightPosition"), lightPosition);

    gl.uniform1f(gl.getUniformLocation(program, "uShininess"), materialShininess);

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uProjectionMatrix"), false, flatten(projectionMatrix));

    document.getElementById("forceSlider").oninput = function (event) {
      appliedForce = parseFloat(event.target.value);
      document.getElementById("forceValue").textContent = appliedForce;
    };

    document.getElementById("massSlider").oninput = function (event) {
      mass = parseFloat(event.target.value);
      document.getElementById("massValue").textContent = mass.toFixed(2);
    };

    document.getElementById("frictionSlider").oninput = function (event) {
      frictionCoefficient = parseFloat(event.target.value);
      document.getElementById("frictionValue").textContent = frictionCoefficient;
    };

    document.getElementById("ModeSelect").onchange = function (event) {
      isAccelerationMode = event.target.value === "acceleration";
      if (isAccelerationMode) {
        alert("Switched to Acceleration Mode");
      } else {
        alert("Switched to Constant Speed Mode");
      }
    };

    // Inisialisasi nilai awal massa pada tampilan
    document.getElementById("massValue").textContent = mass.toFixed(2);

    render();
  }

  function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (flag) theta[axis] += 2.0;

    if (moveFlag) {
      if (isAccelerationMode) {
        var netForce = appliedForce - frictionCoefficient * velocity;
        acceleration = netForce / mass;
        velocity += acceleration * 0.01 * speedMultiplier; // Update velocity
      } else {
        acceleration = 0;
        var netForce = appliedForce - frictionCoefficient * velocity;
        velocity = netForce / mass;
      }

      translation[0] += velocity * 0.01 * speedMultiplier; // Move to the right
      translation[2] += velocity * 0.01 * speedMultiplier; // Move further away

      time += 0.01 * speedMultiplier; // Update time

      if (translation[0] > 1.0) {
        moveFlag = false;
      }

      document.getElementById("velocityValue").textContent = velocity.toFixed(2);
      document.getElementById("accelerationValue").textContent = acceleration.toFixed(2);
      document.getElementById("timeValue").textContent = time.toFixed(2);
    }

    modelViewMatrix = mat4();

    // Terapkan translasi
    modelViewMatrix = mult(modelViewMatrix, translate(translation[0], translation[1], translation[2]));

    // Terapkan rotasi
    modelViewMatrix = mult(modelViewMatrix, rotate(theta[xAxis], [1, 0, 0]));
    modelViewMatrix = mult(modelViewMatrix, rotate(theta[yAxis], [0, 1, 0]));
    modelViewMatrix = mult(modelViewMatrix, rotate(theta[zAxis], [0, 0, 1]));

    // Terapkan skala berdasarkan massa
    var scaleFactor = 1 + mass / 25; // Ini akan membuat skala dari 1 hingga 5
    modelViewMatrix = mult(modelViewMatrix, scale(scaleFactor, scaleFactor, scaleFactor));

    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModelViewMatrix"), false, flatten(modelViewMatrix));

    gl.drawArrays(gl.TRIANGLES, 0, numPositions);

    requestAnimationFrame(render);
  }
};

shadedCube();
