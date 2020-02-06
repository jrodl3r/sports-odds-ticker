(function() {
  let app = {
    data: [],                 // data currently displayed
    newData: [],              // data queued for display

    fetchInterval: 300000,    // fetch new data every 5 minutes
    totalDuration: 0,         // full animation in seconds
    matchDuration: 4,         // controls animation speed (2 is fast, 6 is slow)
    matchCounts: [],          // used to calc animation durations

    isIdle: true,             // fetch + animation running?
    isLoading: true,          // controls loaded?

    stage: document.getElementById('stage'),
    spinner: document.getElementById('spinner'),
    empty: document.getElementById('empty-message'),
    error: document.getElementById('error-message'),
    stopButton: document.getElementById('stop-button'),
    startButton: document.getElementById('start-button'),
    reloadButton: document.getElementById('reload-button'),
    blockButton: document.getElementById('block-button'),

    // NOTE: since we're using CSS for animation we can safely use
    //       setInterval to control the app lifecycle (without rAF).
    init: () => {
      if (app.isLoading) { app.initControls(); }
      if (app.isRunning) { clearInterval(app.isRunning); }
      app.isRunning = setInterval(app.fetch, app.fetchInterval);
      app.start();
      app.fetch();
    },

    fetch: () => {
      if (app && !app.isIdle && !app.newData.length) {
        fetch('https://c9aac5f8-dc8e-4ae0-b588-1e528208737e.mock.pstmn.io/getData1')
          .then(res => {
            if (res.ok) { return res.json(); }
            else { throw new Error('Service Connection Error'); }
          })
          .then(data => {
            app.newData = data || [];
            // NOTE: if we get empty data on the first fetch (before we
            //       have a cache built up) then we'll show a warning.
            if (!app.data.length && !app.newData.length) {
              app.spinner.classList.add('disabled');
              app.empty.classList.add('active');
            }
            else if (!app.data.length) { // init cache
              app.update();
              app.spinner.classList.add('disabled');
            }
            app.error.classList.remove('active');
          })
          .catch(error => {
            console.error(error);
            app.error.classList.add('active');
          });
      }
    },

    update: () => {
      if (app && app.newData.length) {
        app.stage.innerHTML = '<div id="slider"></div>';
        app.slider = document.getElementById('slider');
        app.slider.addEventListener('animationiteration', app.update);
        app.data = app.newData;
        // inject labels + matches
        app.data.forEach((league, i) => {
          const label = document.createElement('div');
          const matches = document.createElement('div');
          const template = document.getElementById('match');
          label.classList.add('label');
          label.innerHTML = league.name;
          matches.id = league.name;
          app.slider.appendChild(label);
          app.slider.appendChild(matches);
          app.matchCounts[i] = league.matches.length;
          league.matches.forEach(item => {
            const match = document.importNode(template.content, true);
            const date = item.schedule ? new Date(item.schedule) : null;
            const day = date ? date.toLocaleString('en-us', {  weekday: 'long' }) : null;
            if (date) {
              match.querySelector('.time-day').textContent =
                day.substr(0, day.match(/^(Tuesday|Thursday)$/) ? 4 : 3) || '';
              match.querySelector('.time-hour').textContent =
                date.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true }) || '';
            }
            if (item.odds && item.odds.favourite_team) {
              match.querySelector(
                item.odds.favourite_team == item.home_abbreviation
                  ? '.home .favorite' : '.away .favorite').classList.add('active');
            }
            match.querySelector('.home_name').textContent = item.home_abbreviation || '-';
            match.querySelector('.away_name').textContent = item.away_abbreviation || '-';
            match.querySelector('.home_ml').textContent = item.odds && item.odds.home_ml || '-';
            match.querySelector('.away_ml').textContent = item.odds && item.odds.away_ml || '-';
            match.querySelector('.spread').textContent = item.odds && item.odds.spread || '-';
            match.querySelector('.total').textContent = item.odds && item.odds.total || '-';
            matches.appendChild(match);
          });
        });
        // update animation
        app.totalDuration = app.matchCounts.reduce((a, b) => a + b);
        app.slider.style.animationDuration = (app.totalDuration * app.matchDuration) + 's';
        // reset
        app.newData = [];
        app.matchCounts = [];
        app.empty.classList.remove('active');
      }
    },

    initControls: () => {
      app.stopButton.onclick = app.stop;
      app.startButton.onclick = app.start;
      app.reloadButton.onclick = app.reload;
      app.blockButton.onclick = app.block;
      app.isLoading = false;
    },

    stop: () => {
      if (app) {
        app.isIdle = true;
        app.startButton.removeAttribute('disabled');
        app.stopButton.setAttribute('disabled', true);
        app.slider ? app.slider.classList.add('paused') : null;
      }
    },

    start: () => {
      if (app) {
        app.isIdle = false;
        app.stopButton.removeAttribute('disabled');
        app.startButton.setAttribute('disabled', true);
        app.slider ? app.slider.classList.remove('paused') : null;
      }
    },

    reload: () => {
      if (app) {
        app.data = [];
        app.newData = [];
        app.stage.innerHTML = '';
        app.init();
      }
    },

    // NOTE: after the initial fetch + update we can do just about
    //       anything to the client and the app will continue to
    //       display as expected. we could for example: delete the
    //       app (see below), disconnect the internet or even
    //       disable JavaScript altogether.
    block: () => {
      if (app) {
        const temp = app;
        app = null;
        setTimeout(() => {
          app = temp;
          app.init();
        }, 10000);
      }
    }
  };

  app.init();

})();
