// Copyright 2016 AOL Platforms.

const AolSync = function AolSync() {

  const PIXELS_ITEMS = {
    iframe: 'IFRAME',
    img: 'IMG'
  };

  function renderPixels(pixels) {
    let pixelsElements = parsePixelsItems(pixels);
    renderPixelsItems(pixelsElements);
  }

  function parsePixelsItems(pixels) {
    let itemsRegExp = /(img|iframe)[\s\S]*?src\s*=\s*("([^"]*)"|'([^"]*)')/gi;
    let tagNameRegExp = /\w*(?=\s)/;
    let srcRegExp = /src=(")(.+)"/;
    let pixelsItems = [];

    if (pixels) {
      pixels.match(itemsRegExp).forEach((item) => {
        let tagNameMatches = item.match(tagNameRegExp);
        let sourcesPathMatches = item.match(srcRegExp);

        if (tagNameMatches && sourcesPathMatches) {
          pixelsItems.push({
            tagName: tagNameMatches[0].toUpperCase(),
            src: sourcesPathMatches[2]
          });
        }
      });
    }

    return pixelsItems;
  }

  function renderPixelsItems(pixelsItems) {
    pixelsItems.forEach((item) => {
      switch (item.tagName) {
        case PIXELS_ITEMS.img :
          renderPixelsImage(item);
          break;
        case PIXELS_ITEMS.iframe :
          renderPixelsIframe(item);
          break;
      }
    });
  }

  function renderPixelsImage(pixelsItem) {
    let image = new Image();

    image.src = pixelsItem.src;
  }

  function renderPixelsIframe(pixelsItem) {
    let iframe = document.createElement('iframe');

    iframe.width = 1;
    iframe.height = 1;
    iframe.style = 'display: none';
    iframe.src = pixelsItem.src;
    document.body.appendChild(iframe);
  }

  return {
    renderPixels,
    parsePixelsItems,
    renderPixelsItems,
    renderPixelsImage,
    renderPixelsIframe
  }
};

module.exports = AolSync();
