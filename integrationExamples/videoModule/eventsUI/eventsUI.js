"use strict";

let sequenceCount = 0;
const eventLogGroups = {};
const Uint8Array = window.Uint8Array;
const TimeRanges = window.TimeRanges;

function stringify(value, replacer, space) {
  try {
    return truncate(JSON.stringify(value, replacer || stringifyReplacer(value), space), 100000);
  } catch (error) {
    return `[${error}]`;
  }
}

function truncate(str, length) {
  return (str && str.length) > length ? (str.substr(0, length) +
    '\n... Event truncated due to length (see console for complete output)') : str;
}

function stringifyReplacer(parentValue) {
  const references = [];
  const safeResults = [];
  let complexity = 0;
  return function stringifyKeyValue(key, value) {
    if (typeof value === 'object') {
      if (value === null || value instanceof Date || value instanceof RegExp) {
        return value;
      }
      if (!!Uint8Array && value instanceof Uint8Array) {
        // Stub values of Arrays with more than 1000 items
        let str = ('' + value);
        str = (str.length > 40 ? (str.substr(0, 40) + '...(see console)') : str);
        return `Uint8Array(${value.length}) [${str}]`;
      }
      if (!!TimeRanges && value instanceof TimeRanges) {
        const ranges = [];
        for (let i = 0; i < value.length; i++) {
          ranges[i] = `start(${i}) = ${value.start(i)} end(${i}) = ${value.end(i)}`;
        }
        return `TimeRanges(${value.length}) [${ranges}]`;
      }
      if (value === parentValue && complexity > 0) {
        return '<parent object>';
      }
      const referenceIndex = references.indexOf(value);
      if (referenceIndex !== -1) {
        // Duplicate reference found
        const safe = safeResults[referenceIndex];
        if (safe) {
          return safe;
        }
        try {
          // Test for circular references
          JSON.stringify(value);
        } catch (error) {
          return (safeResults[referenceIndex] = '<' + value + '...(see console)>');
        }
        safeResults[referenceIndex] = value;
      }
      if (complexity++ > 10000) {
        return '<complexity exceeded>';
      }
      references.push(value);
      return value;
    }
    if (typeof value === 'function') {
      return `${value}`;
    }
    return value;
  };
}

function createEventSequenceElement(eventGroup) {
  const element = document.createElement('div');
  element.classList.add('sequence', `mode-${eventGroup}`);
  element.setAttribute('data-sequence', `${sequenceCount++}`);
  return element;
}

function appendSequenceElement(container, element) {
  container.appendChild(element);
}

function textContentGrouped(inEvent, group) {
  if (group) {
    return `${inEvent} (${group[inEvent]})`;
  }
  return inEvent;
}

function appendEvent(container, currentEventType, currentEventGroup, data) {
  const div = document.createElement('div');
  div.classList.add('group-' + currentEventGroup, 'event-' + currentEventType, 'pre');
  div.textContent = textContentGrouped(currentEventType);
  div.setAttribute('title', `${currentEventGroup} event "${currentEventType}"`);
  div.setAttribute('tabindex', '0');
  const theData = Object.assign({}, data);
  div.onclick = div.onkeyup = function(e) {
    if (e && e.keyCode && e.keyCode !== 13) {
      return;
    }

    console.log(theData);
    div.textContent = ((div.expanded = !div.expanded)) ?
      textContentExpanded(currentEventType, [theData]) : textContentGrouped(currentEventType);
    if (e) {
      e.preventDefault();
    }
    return [theData];
  };
  container.appendChild(div);
  return div;
}

function textContentExpanded(inEvent, allData) {
  return `${inEvent} (${allData.map((item, i) =>
    (allData.length > 1 ? `[${i}] = ` : '') + stringify(item, null, 4)).join('\n')})`;
}

function incrementEvent(group, currentEventType, currentEventGroup, div, datum) {
  group[currentEventType]++;
  div.textContent = textContentGrouped(currentEventType, group);
  const logPreviousEvents = div.onclick;
  const scopedDatum = Object.assign({}, datum);
  div.onclick = div.onkeyup = function(e) {
    if (e && e.keyCode && e.keyCode !== 13) {
      return;
    }

    const allData = logPreviousEvents();
    allData.push(scopedDatum);
    console.log(scopedDatum);
    div.textContent = (div.expanded) ? textContentExpanded(currentEventType, allData) : textContentGrouped(currentEventType, group);
    if (e) {
      e.preventDefault();
    }
    return allData;
  };
}

function getGenericEventHandler() {
  const logContainer = document.querySelector('#eventsLog');
  let currentEventGroup = '';
  let currentEventType = '';
  let lastEvent = '';
  let lastGroup;
  const genericEventHandler = function(e, type, eventGroup) {
    currentEventGroup = eventGroup;
    currentEventType = type;

    let group = eventLogGroups[eventGroup];
    if (!group || group !== lastGroup) {
      const beforeReadyElement = createEventSequenceElement(currentEventGroup);
      appendSequenceElement(logContainer, beforeReadyElement);
      group = eventLogGroups[currentEventGroup] = {
        eventGroup: currentEventGroup,
        event: currentEventType,
        container: logContainer,
        eventElement: beforeReadyElement
      };
      lastGroup = lastGroup || group;
    }
    if (lastEvent === currentEventType && !(/^(?:meta|hlsBufferAppend)/).test(currentEventType)) {
      incrementEvent(group, currentEventType, currentEventGroup, group.pre, e);
    } else {
      const eventElement = createEventSequenceElement(currentEventGroup);
      group[currentEventType] = 1;
      group.eventElement = eventElement;
      group.lastEventGroup = currentEventGroup;
      group.pre = appendEvent(eventElement, currentEventType, currentEventGroup, e);
      appendSequenceElement(group.container, eventElement);
    }
    lastEvent = currentEventType;
    lastGroup = group;
  };

  return genericEventHandler;
}

window.getGenericEventHandler = getGenericEventHandler;
