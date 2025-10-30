import javascript
import DataFlow

SourceNode otherWindow(TypeTracker t) {
  t.start() and (
   result = globalVarRef("window") or
   result = globalVarRef("top") or
   result = globalVarRef("self") or
   result = globalVarRef("parent") or
   result = globalVarRef("frames").getAPropertyRead() or
   result = DOM::documentRef().getAPropertyRead("defaultView")
  ) or
  exists(TypeTracker t2 |
    result = otherWindow(t2).track(t2, t)
  )
}

SourceNode otherWindow() {
 result = otherWindow(TypeTracker::end())
}

SourceNode connectedWindow(TypeTracker t, SourceNode win) {
  t.start() and (
    result = win.getAPropertyRead("self") or
    result = win.getAPropertyRead("top") or
    result = win.getAPropertyRead("parent") or
    result = win.getAPropertyRead("frames").getAPropertyRead() or
    result = win.getAPropertyRead("document").getAPropertyRead("defaultView")
  ) or
  exists(TypeTracker t2 |
    result = connectedWindow(t2, win).track(t2, t)
  )
}

SourceNode connectedWindow(SourceNode win) {
  result = connectedWindow(TypeTracker::end(), win)
}

SourceNode relatedWindow(SourceNode win) {
  result = connectedWindow(win) or
  result = relatedWindow+(connectedWindow(win))
}

SourceNode anyWindow() {
  result = otherWindow() or
  result = relatedWindow(otherWindow())
}

SourceNode windowPropertyRead(TypeTracker t, string prop) {
  t.start() and (
    result = globalVarRef(prop) or
    result = anyWindow().getAPropertyRead(prop)
  ) or
  exists(TypeTracker t2 |
    result = windowPropertyRead(t2, prop).track(t2, t)
  )
}

/*
 Matches uses of property `prop` done on any window object.
*/
SourceNode windowPropertyRead(string prop) {
  result = windowPropertyRead(TypeTracker::end(), prop)
}

/**
 Matches both invocations and instantiations of fn.
*/
SourceNode callTo(SourceNode fn) {
   result = fn.getAnInstantiation() or
   result = fn.getAnInvocation()
}

SourceNode global(TypeTracker t, string name) {
   t.start() and (
     result = windowPropertyRead(name)
   ) or exists(TypeTracker t2 |
     result = global(t2, name).track(t2, t)
   )
}


/**
 Tracks a global (name reachable from a window object).
*/
SourceNode global(string name) {
   result = global(TypeTracker::end(), name)
}

SourceNode oneDeepGlobal(TypeTracker t, string parent, string name) {
  t.start() and (
     result = global(parent).getAPropertyRead(name)
  ) or exists(TypeTracker t2 |
     result = oneDeepGlobal(t2, parent, name).track(t2, t)
  )
}

/*
 Tracks a name reachable 1 level down from the global (e.g. `Intl.DateTimeFormat`).
*/
SourceNode oneDeepGlobal(string parent, string name) {
  result = oneDeepGlobal(TypeTracker::end(), parent, name)
}
