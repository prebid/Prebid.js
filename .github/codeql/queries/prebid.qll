import javascript
import DataFlow

SourceNode otherWindow() {
 result = globalVarRef("top") or
 result = globalVarRef("self") or
 result = globalVarRef("parent") or
 result = globalVarRef("frames").getAPropertyRead() or
 result = DOM::documentRef().getAPropertyRead("defaultView")
}

SourceNode connectedWindow(SourceNode win) {
  result = win.getAPropertyRead("self") or
  result = win.getAPropertyRead("top") or
  result = win.getAPropertyRead("parent") or
  result = win.getAPropertyRead("frames").getAPropertyRead() or
  result = win.getAPropertyRead("document").getAPropertyRead("defaultView")
}

SourceNode relatedWindow(SourceNode win) {
  result = connectedWindow(win) or
  result = relatedWindow+(connectedWindow(win))
}

SourceNode anyWindow() {
  result = otherWindow() or
  result = relatedWindow(otherWindow())
}

/*
 Matches uses of property `prop` done on any window object.
*/
SourceNode windowPropertyRead(string prop) {
  result = globalVarRef(prop) or
  result = anyWindow().getAPropertyRead(prop)
}

SourceNode instantiationOf(string ctr) {
   result = windowPropertyRead(ctr).getAnInstantiation()
}

