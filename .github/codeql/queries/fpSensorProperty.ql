/**
 * @id prebid/fp-sensor-property
 * @name Fingerprinting API (sensor property)
 * @kind problem
 * @problem.severity warning
 * @description Usage of browser APIs associated with fingerprinting
 */

// Finds property access on sensor objects (e.g. `new Gyroscope().someProperty`)

import prebid
import autogen_fpSensorProperty

SourceNode sensor(TypeTracker t) {
  t.start() and exists(string variant |
    variant in [
      "Gyroscope",
      "Accelerometer",
      "LinearAccelerationSensor",
      "AbsoluteOrientationSensor",
      "RelativeOrientationSensor",
      "Magnetometer",
      "AmbientLightSensor"
    ] and
    result = callTo(global(variant))
  ) or exists(TypeTracker t2 |
    result = sensor(t2).track(t2, t)
  )
}

from SensorProperty prop, SourceNode use
where
   use = sensor(TypeTracker::end()).getAPropertyRead(prop)
select use, "Sensor." + prop + " is an indicator of fingerprinting; weight: " + prop.getWeight()
