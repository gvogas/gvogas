(() => {
  const photos = [...document.querySelectorAll('[data-photo]')];
  const viewer = document.querySelector('.photo-viewer');
  if (!photos.length || !viewer || typeof viewer.showModal !== 'function') return;
  const image = viewer.querySelector('.photo-viewer__stage img');
  const count = viewer.querySelector('[data-photo-count]');
  // Deter casual saving; publicly displayed images cannot be copy-protected.
  document.querySelectorAll('.photography__photo, .photo-viewer__stage img').forEach(element => {
    element.addEventListener('contextmenu', event => event.preventDefault());
    element.addEventListener('dragstart', event => event.preventDefault());
  });
  document.querySelectorAll('.photography__photo img, .photo-viewer__stage img').forEach(element => {
    element.draggable = false;
  });
  let current = 0;
  let opener;
  let previousOverflow = '';

  function show(index) {
    current = (index + photos.length) % photos.length;
    const photo = photos[current];
    image.src = photo.querySelector('img').src;
    image.alt = photo.querySelector('img').alt;
    count.textContent = `${photo.dataset.category} / ${String(current + 1).padStart(2, '0')} of ${photos.length}`;
  }

  photos.forEach((photo, index) => {
    photo.addEventListener('click', event => {
      event.preventDefault();
      opener = photo;
      previousOverflow = document.body.style.overflow;
      show(index);
      viewer.showModal();
      document.body.style.overflow = 'hidden';
    });
  });
  viewer.querySelector('[data-photo-close]').addEventListener('click', () => viewer.close());
  viewer.querySelector('[data-photo-prev]').addEventListener('click', () => show(current - 1));
  viewer.querySelector('[data-photo-next]').addEventListener('click', () => show(current + 1));
  viewer.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  viewer.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    opener?.focus({ preventScroll: true });
  });
})();
