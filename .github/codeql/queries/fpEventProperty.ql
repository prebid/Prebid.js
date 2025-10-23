/**
 * @id prebid/fp-event-property
 * @name Fingerprinting API (event property)
 * @kind problem
 * @problem.severity warning
 * @description Usage of browser APIs associated with fingerprinting
 */

// Finds property access on event objects (e.g. `.addEventListener('someEvent', (event) => event.someProperty)`)

import prebid
import autogen_fpEventProperty

SourceNode eventListener(TypeTracker t, string event) {
  t.start() and
  (
    exists(MethodCallNode addEventListener |
      addEventListener.getMethodName() = "addEventListener" and
      addEventListener.getArgument(0).mayHaveStringValue(event) and
      result = addEventListener.getArgument(1).(FunctionNode).getParameter(0)
    )
  )
  or
  exists(TypeTracker t2 |
    result = eventListener(t2, event).track(t2, t)
  )
}

SourceNode eventSetter(TypeTracker t, string eventSetter) {
  t.start() and
  exists(PropWrite write |
    write.getPropertyName() = eventSetter and
    result = write.getRhs().(FunctionNode).getParameter(0)
  ) or
  exists(TypeTracker t2 |
   result = eventSetter(t2, eventSetter).track(t2, t)
  )
}

bindingset[event]
SourceNode event(string event) {
  result = eventListener(TypeTracker::end(), event) or
  result = eventSetter(TypeTracker::end(), "on" + event.toLowerCase())
}


from EventProperty prop, SourceNode use
where
   use = event(prop.getEvent()).getAPropertyRead(prop)
select use, prop.getEvent() + "event ." + prop + " is an indicator of fingerprinting; weight: " + prop.getWeight()
