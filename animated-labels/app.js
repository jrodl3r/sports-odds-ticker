/* https://github.com/jrodl3r/sports-odds-ticker */

(function() {
  let app = {
    data: [],                 // data currently displayed
    newData: [],              // data queued for display

    fetchInterval: 300000,    // fetch new data every 5 minutes
    totalDuration: 0,         // full animation in seconds
    matchDuration: 4,         // controls animation speed (3 is fast, 5 is slow)
    matchCounts: [],          // used to calc animation durations
    leagueLabels: [],

    isIdle: true,             // fetch + animation running?
    isLoading: true,          // controls loaded?

    stage: document.getElementById('stage'),
    leagueTunnel: document.getElementById('league-tunnel'),
    league: document.getElementById('league'),
    spinner: document.getElementById('spinner'),
    error: document.getElementById('error-message'),
    stopButton: document.getElementById('stop-button'),
    startButton: document.getElementById('start-button'),
    reloadButton: document.getElementById('reload-button'),

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
              app.leagueTunnel.classList.add('empty');
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
        app.league.innerHTML = '';
        app.stage.innerHTML = '<div id="slider"></div>';
        app.slider = document.getElementById('slider');
        app.slider.addEventListener('animationiteration', app.update);
        app.data = app.newData;
        // inject labels + matches
        app.data.forEach((league, i) => {
          const label = document.createElement('div');
          const matches = document.createElement('div');
          const template = document.getElementById('match');
          label.id = league.name + '-label';
          label.innerHTML = league.name;
          app.league.appendChild(label);
          matches.id = league.name;
          app.slider.appendChild(matches);
          app.matchCounts[i] = league.matches.length > 3 ? league.matches.length : league.matches.length + 1;
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
        // update slider + label animations
        app.totalDuration = app.matchCounts.reduce((a, b) => a + b);
        app.slider.style.animationDuration = (app.totalDuration * app.matchDuration) + 's';
        if (!app.animStyle) {
          app.animStyle = document.createElement('style');
          app.animStyle.type = 'text/css';
          document.getElementsByTagName('head')[0].appendChild(app.animStyle);
        }
        app.leagueLabels = [];
        app.data.forEach((league, i) => {
          let label = document.getElementById(league.name + '-label');
          let slice = 0, // used to calc keyframes
              start = 0, // start point percentage
              end = 0;   // end point percentage
          app.leagueLabels.push(label);
          if (i === 0) { // first label
            if (app.data.length === 1) {
              app.animStyle.innerHTML = `
                @keyframes ${league.name} {
                  0% { height: 100%; width: 100%; opacity: 1; }
                  100% { height: 100%; width: 100%; opacity: 1; }
                }`;
            } else {
              slice = app.matchCounts[i] / app.totalDuration;
              end = Math.round(slice * 100) - app.matchDuration;
              app.animStyle.innerHTML = `
                @keyframes ${league.name} {
                  0% { height: 100%; width: 100%; opacity: 1; }
                  ${end}% { height: 100%; width: 100%; opacity: 1 }
                  ${end + 1}% { height: 0; width: 0; opacity: 0; }
                  100% { height: 0; width: 0; opacity: 0; }
                }`;
            }
          } else if (i !== app.data.length - 1) { // middle label(s)
            let start = Math.round(app.matchCounts.slice(0, i).reduce((a, b) => a + b) / app.totalDuration * 100) - app.matchDuration;
            let end = Math.round((app.matchCounts.slice(0, i).reduce((a, b) => a + b) + app.matchCounts[i]) / app.totalDuration * 100) - app.matchDuration;
            app.animStyle.innerHTML = app.animStyle.innerHTML + `
              @keyframes ${league.name} {
                0% { height: 0; width: 0; opacity: 0; }
                ${start}% { height: 0; width: 0; opacity: 0; }
                ${start + 1}% { height: 100%; width: 100%; opacity: 1 }
                ${end}% { height: 100%; width: 100%; opacity: 1 }
                ${end + 1}% { height: 0; width: 0; opacity: 0; }
                100% { height: 0; width: 0; opacity: 0; }
              }`;
          } else { // last label
            app.matchCounts.pop();
            slice = app.matchCounts.reduce((a, b) => a + b) / app.totalDuration;
            start = Math.round(slice * 100) - app.matchDuration;
            app.animStyle.innerHTML = app.animStyle.innerHTML + `
              @keyframes ${league.name} {
                0% { height: 0; width: 0; opacity: 0; }
                ${start}% { height: 0; width: 0; opacity: 0; }
                ${start + 1}% { height: 100%; width: 100%; opacity: 1 }
                99% { height: 100%; width: 100%; opacity: 1 }
                100% { height: 0; width: 0; opacity: 0; }
              }`;
          }
          label.style.animationName = league.name;
          label.style.animationDuration = (app.totalDuration * app.matchDuration) + 's';
        });
        app.newData = [];
        app.matchCounts = [];
        app.leagueTunnel.classList.remove('empty');
      }
    },

    initControls: () => {
      app.stopButton.onclick = app.stop;
      app.startButton.onclick = app.start;
      app.reloadButton.onclick = app.reload;
      app.isLoading = false;
    },

    stop: () => {
      if (app) {
        app.isIdle = true;
        app.startButton.removeAttribute('disabled');
        app.stopButton.setAttribute('disabled', true);
        app.slider ? app.slider.classList.add('paused') : null;
        app.leagueLabels.forEach(label => label.classList.add('paused'));
      }
    },

    start: () => {
      if (app) {
        app.isIdle = false;
        app.stopButton.removeAttribute('disabled');
        app.startButton.setAttribute('disabled', true);
        app.slider ? app.slider.classList.remove('paused') : null;
        app.leagueLabels.forEach(label => label.classList.remove('paused'));
      }
    },

    reload: () => {
      if (app) {
        app.data = [];
        app.newData = [];
        app.stage.innerHTML = '';
        app.init();
      }
    }
  };

  app.init();

})();
