const faceapi = require("face-api.js");
const tf = require("@tensorflow/tfjs");

const canvas = require("canvas");

const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

async function loadModels() {
    console.log("Loading models...");
    await faceapi.nets.ssdMobilenetv1.loadFromDisk("./models");
    await faceapi.nets.faceLandmark68Net.loadFromDisk("./models");
    console.log("Models loaded!");
}

module.exports = { faceapi, loadModels };
