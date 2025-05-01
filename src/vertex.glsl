//vertx controls position and size
uniform float uTime;
uniform float uSize;
attribute float aScale;
attribute vec3 aRandom;
varying vec3 vColor;

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    float floatSpeed = 0.8;
    float parallaxFactor = 0.6 + modelPosition.z * 0.01;
    float xOffset = (uTime * floatSpeed * 0.7) * parallaxFactor;
    float yOffset = (uTime * floatSpeed * 0.7) * parallaxFactor;
    
    modelPosition.x += xOffset;
    modelPosition.y += yOffset;
    modelPosition.xyz += aRandom;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    float sizeModifier = 2.0 - (modelPosition.z / 100.0);
    gl_PointSize = uSize * aScale * max(sizeModifier, 0.5);
    gl_PointSize *= (1.0 / - viewPosition.z);

    vColor = color;
}