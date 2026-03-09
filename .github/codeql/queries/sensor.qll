import prebid

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
    result = callTo(variant)
  ) or exists(TypeTracker t2 |
    result = sensor(t2).track(t2, t)
  )
}

SourceNode sensor() {
  result = sensor(TypeTracker::end())
}
