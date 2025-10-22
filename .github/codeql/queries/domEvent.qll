import prebid


SourceNode domEventListener(TypeTracker t, string event) {
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
    result = domEventListener(t2, event).track(t2, t)
  )
}

SourceNode domEventSetter(TypeTracker t, string eventSetter) {
  t.start() and
  exists(PropWrite write |
    write.getPropertyName() = eventSetter and
    result = write.getRhs().(FunctionNode).getParameter(0)
  ) or
  exists(TypeTracker t2 |
   result = domEventSetter(t2, eventSetter).track(t2, t)
  )
}

bindingset[event]
SourceNode domEvent(string event) {
  result = domEventListener(TypeTracker::end(), event) or
  result = domEventSetter(TypeTracker::end(), "on" + event.toLowerCase())
}
