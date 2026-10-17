// A bounded projection of visible local media, surfaces, icons and text. The
// original DOM retains all accessibility and interaction; no app clone is mounted.
export const GLASS_PADDING = 36;
function intersects(a, b) {
  return a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
}
function splitLayers(value) {
  const parts = [];
  let depth = 0,
    start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    if (value[i] === ')') depth--;
    if (value[i] === ',' && !depth) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts;
}
function gradient(context, value, rect) {
  if (!value.startsWith('linear-gradient(')) return null;
  const parts = splitLayers(value.slice(16, -1));
  const direction = parts[0];
  let angle = 180;
  if (direction.endsWith('deg')) angle = parseFloat(parts.shift());
  else if (direction.startsWith('to ')) {
    parts.shift();
    angle = { 'to right': 90, 'to left': 270, 'to top': 0, 'to bottom': 180 }[direction] ?? 135;
  }
  const dx = Math.sin((angle * Math.PI) / 180),
    dy = -Math.cos((angle * Math.PI) / 180);
  const length = Math.abs(rect.width * dx) + Math.abs(rect.height * dy);
  const x = rect.left + rect.width / 2,
    y = rect.top + rect.height / 2;
  const fill = context.createLinearGradient(
    x - (dx * length) / 2,
    y - (dy * length) / 2,
    x + (dx * length) / 2,
    y + (dy * length) / 2,
  );
  parts.forEach((part, i) => {
    const stop = part.match(/^(.*?)(?:\s+(-?[\d.]+)(%|px))?$/);
    const position =
      stop[2] === undefined
        ? i / Math.max(1, parts.length - 1)
        : Number(stop[2]) / (stop[3] === '%' ? 100 : length || 1);
    try {
      fill.addColorStop(Math.max(0, Math.min(1, position)), stop[1]);
    } catch {
      /* Unsupported color. */
    }
  });
  return fill;
}
function radius(style, rect) {
  const value = style.borderTopLeftRadius;
  return (
    Math.min(
      rect.width / 2,
      rect.height / 2,
      parseFloat(value) * (value.endsWith('%') ? Math.min(rect.width, rect.height) / 100 : 1),
    ) || 0
  );
}
function rounded(context, rect, amount) {
  context.beginPath();
  context.roundRect(rect.left, rect.top, rect.width, rect.height, amount);
}
function readableMedia(source) {
  try {
    const url = new URL(source.currentSrc || source.src, location.href);
    return (
      url.origin === location.origin ||
      ['data:', 'blob:'].includes(url.protocol) ||
      ['anonymous', 'use-credentials'].includes(source.crossOrigin)
    );
  } catch {
    return false;
  }
}
function paintMedia(context, element, rect, style, region) {
  const width = element.videoWidth || element.naturalWidth,
    height = element.videoHeight || element.naturalHeight;
  if (
    !width ||
    !height ||
    !readableMedia(element) ||
    (element.tagName === 'VIDEO' && element.readyState < 2)
  )
    return;
  const fit = style.objectFit;
  const factor = (fit === 'contain' ? Math.min : Math.max)(
    rect.width / width,
    rect.height / height,
  );
  const sizeX = fit === 'fill' ? rect.width : width * factor,
    sizeY = fit === 'fill' ? rect.height : height * factor;
  const [posX, posY] = style.objectPosition.split(' ');
  const fraction = (value) => (value?.endsWith('%') ? parseFloat(value) / 100 : 0.5);
  const originX = rect.left + (rect.width - sizeX) * fraction(posX);
  const originY = rect.top + (rect.height - sizeY) * fraction(posY);
  const left = Math.max(rect.left, originX, region.left),
    top = Math.max(rect.top, originY, region.top);
  const right = Math.min(rect.right, originX + sizeX, region.right),
    bottom = Math.min(rect.bottom, originY + sizeY, region.bottom);
  if (right <= left || bottom <= top) return;
  context.save();
  rounded(context, rect, radius(style, rect));
  context.clip();
  // Crop at the source, so WebKit never rescales an entire cover-sized video
  // frame just to paint this narrow strip.
  context.drawImage(
    element,
    ((left - originX) / sizeX) * width,
    ((top - originY) / sizeY) * height,
    ((right - left) / sizeX) * width,
    ((bottom - top) / sizeY) * height,
    left,
    top,
    right - left,
    bottom - top,
  );
  context.restore();
}
function paintSvg(context, element, rect, color) {
  const box = element.viewBox.baseVal;
  if (!box.width || !box.height) return;
  const scale = Math.min(rect.width / box.width, rect.height / box.height);
  context.save();
  context.translate(
    rect.left + (rect.width - box.width * scale) / 2,
    rect.top + (rect.height - box.height * scale) / 2,
  );
  context.scale(scale, scale);
  context.translate(-box.x, -box.y);
  for (const shape of element.querySelectorAll('path,circle,line,rect,polyline,polygon')) {
    const style = getComputedStyle(shape),
      path = new Path2D();
    const n = (attr) => Number(shape.getAttribute(attr) || 0);
    if (shape.tagName === 'path') path.addPath(new Path2D(shape.getAttribute('d') || ''));
    if (shape.tagName === 'circle') path.arc(n('cx'), n('cy'), n('r'), 0, Math.PI * 2);
    if (shape.tagName === 'line') {
      path.moveTo(n('x1'), n('y1'));
      path.lineTo(n('x2'), n('y2'));
    }
    if (shape.tagName === 'rect') path.roundRect(n('x'), n('y'), n('width'), n('height'), n('rx'));
    if (['polyline', 'polygon'].includes(shape.tagName)) {
      const points = (shape.getAttribute('points') || '').split(/[\s,]+/).map(Number);
      for (let i = 0; i + 1 < points.length; i += 2) {
        if (i === 0) path.moveTo(points[i], points[i + 1]);
        else path.lineTo(points[i], points[i + 1]);
      }
      if (shape.tagName === 'polygon') path.closePath();
    }
    context.fillStyle = style.fill === 'currentcolor' ? color : style.fill;
    context.strokeStyle = style.stroke === 'currentcolor' ? color : style.stroke;
    context.lineWidth = parseFloat(style.strokeWidth) || 1;
    context.lineCap = style.strokeLinecap;
    context.lineJoin = style.strokeLinejoin;
    if (style.fill !== 'none') context.fill(path);
    if (style.stroke !== 'none') context.stroke(path);
  }
  context.restore();
}
function font(context, style) {
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  if ('letterSpacing' in context)
    context.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
  context.textBaseline = 'alphabetic';
  context.fillStyle = style.color;
}
function baseline(context, text, rect) {
  const metrics = context.measureText(text);
  const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
  const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
  return rect.top + (rect.height - ascent - descent) / 2 + ascent;
}
function paintText(context, node, style, region) {
  if (!node.textContent.trim()) return;
  font(context, style);
  const range = document.createRange();
  range.selectNodeContents(node);
  if (![...range.getClientRects()].some((rect) => intersects(rect, region))) return;
  for (const match of node.textContent.matchAll(/\S+/g)) {
    range.setStart(node, match.index);
    range.setEnd(node, match.index + match[0].length);
    const rect = range.getBoundingClientRect();
    if (!intersects(rect, region)) continue;
    const text =
      style.textTransform === 'uppercase'
        ? match[0].toUpperCase()
        : style.textTransform === 'lowercase'
          ? match[0].toLowerCase()
          : match[0];
    context.fillText(text, rect.left, baseline(context, text, rect));
  }
}
export function createGlassScene() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  if (!context) return null;
  return {
    canvas,
    paint(bounds) {
      const density = Math.min(window.devicePixelRatio || 1, 1.25, 900 / bounds.width);
      const region = {
        left: bounds.left - GLASS_PADDING,
        top: bounds.top - GLASS_PADDING,
        right: bounds.right + GLASS_PADDING,
        bottom: bounds.bottom + GLASS_PADDING,
        width: bounds.width + GLASS_PADDING * 2,
        height: bounds.height + GLASS_PADDING * 2,
      };
      const width = Math.round(region.width * density),
        height = Math.round(region.height * density);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalAlpha = 1;
      context.fillStyle = '#050505';
      context.fillRect(0, 0, width, height);
      context.setTransform(density, 0, 0, density, -region.left * density, -region.top * density);
      let moving = false,
        unreadableMedia = false,
        elements = 0;
      function visit(element, opacity = 1) {
        if (
          !(element instanceof Element) ||
          ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(element.tagName)
        )
          return;
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height || !intersects(rect, region)) return;
        const style = getComputedStyle(element);
        if (style.visibility !== 'visible' || style.display === 'none') return;
        // Keep sampling through an opacity transition: the first `playing`
        // event can fire while the Hero video is still transparent.
        if (element.tagName === 'VIDEO' && !element.paused && element.readyState >= 2)
          moving = true;
        if (element.getAnimations().some((animation) => animation.playState === 'running'))
          moving = true;
        opacity *= Number(style.opacity);
        if (opacity < 0.005) return;
        elements++;
        context.save();
        context.globalAlpha = opacity;
        rounded(context, rect, radius(style, rect));
        context.fillStyle = style.backgroundColor;
        context.fill();
        for (const layer of splitLayers(style.backgroundImage).reverse()) {
          const fill = gradient(context, layer, rect);
          if (fill) {
            context.fillStyle = fill;
            context.fill();
          }
        }
        const border = parseFloat(style.borderTopWidth);
        if (border && style.borderTopStyle !== 'none') {
          context.strokeStyle = style.borderTopColor;
          context.lineWidth = border;
          context.stroke();
        }
        if (
          ['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowX) ||
          ['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowY)
        )
          context.clip();
        if (['IMG', 'VIDEO'].includes(element.tagName)) {
          // The native backdrop can show external media that Canvas cannot read.
          // Never substitute the dark poster underneath a visible remote video
          // in the opaque bevel; use native glass for this header region instead.
          const hasFrame =
            element.tagName === 'VIDEO'
              ? element.readyState >= 2 && element.videoWidth > 0
              : element.naturalWidth > 0;
          if (hasFrame && !readableMedia(element) && intersects(rect, bounds))
            unreadableMedia = true;
          paintMedia(context, element, rect, style, region);
          if (element.tagName === 'VIDEO' && !element.paused && element.readyState >= 2)
            moving = true;
        } else if (element.tagName.toLowerCase() === 'svg') {
          paintSvg(context, element, rect, style.color);
        } else if (['INPUT', 'TEXTAREA'].includes(element.tagName)) {
          if (element.type !== 'password') {
            font(context, element.value ? style : getComputedStyle(element, '::placeholder'));
            const text = element.value || element.placeholder || '';
            const textRect = {
              top: rect.top + parseFloat(style.paddingTop),
              height: parseFloat(style.fontSize) * 1.2,
            };
            context.fillText(
              text.split('\n')[0],
              rect.left + parseFloat(style.paddingLeft),
              baseline(context, text, textRect),
            );
          }
        } else {
          if (style.animationName !== 'none' && style.animationPlayState !== 'paused')
            moving = true;
          for (const child of element.childNodes) {
            if (child.nodeType === Node.TEXT_NODE) paintText(context, child, style, region);
            else visit(child, opacity);
          }
        }
        context.restore();
      }
      for (const root of document.querySelectorAll('#main, #root > footer')) visit(root);
      return { canvas, context, region, density, moving, elements, unreadableMedia };
    },
  };
}
