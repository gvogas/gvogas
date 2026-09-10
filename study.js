(() => {
  const list = document.querySelector('#study .study__list');
  if (!list) return;
  const subjects = [...list.children];
  const explorer = document.createElement('div');
  explorer.className = 'study-explorer';
  const tabs = document.createElement('div');
  tabs.className = 'study-explorer__tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Subjects I study');
  tabs.setAttribute('aria-orientation', 'vertical');
  const stage = document.createElement('div');
  stage.className = 'study-explorer__stage';
  const buttons = [];
  const panels = [];

  function select(index, focus = false) {
    buttons.forEach((button, i) => {
      button.setAttribute('aria-selected', String(i === index));
      button.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (focus) buttons[index].focus();
  }

  subjects.forEach((subject, index) => {
    const title = subject.querySelector('.study__title').textContent;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = `study-tab-${index}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', `study-panel-${index}`);
    const icon = subject.querySelector('.study__icon').cloneNode(true);
    const label = document.createElement('span');
    label.textContent = title;
    button.append(icon, label);
    button.addEventListener('click', () => select(index));
    button.addEventListener('keydown', event => {
      const destinations = {
        ArrowDown: (index + 1) % subjects.length,
        ArrowUp: (index - 1 + subjects.length) % subjects.length,
        Home: 0,
        End: subjects.length - 1,
      };
      if (event.key in destinations) {
        event.preventDefault();
        select(destinations[event.key], true);
      }
    });
    const panel = document.createElement('div');
    panel.className = 'study-explorer__panel';
    panel.id = `study-panel-${index}`;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', button.id);
    panel.tabIndex = 0;
    const eyebrow = document.createElement('p');
    eyebrow.className = 'study-explorer__label';
    eyebrow.textContent = 'IN CLASS / IN PRACTICE';
    panel.append(eyebrow, subject.querySelector('.study__icon').cloneNode(true));
    for (const selector of ['.study__title', '.study__blurb', '.study__skills']) {
      panel.append(subject.querySelector(selector).cloneNode(true));
    }
    buttons.push(button);
    panels.push(panel);
    tabs.append(button);
    stage.append(panel);
  });
  explorer.append(tabs, stage);
  select(0);
  list.replaceWith(explorer);
})();
