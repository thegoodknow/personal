const targetUrl = "https://thegoodknow.nx.kg/home";
        let seconds = 5;
        const countdownEl = document.getElementById("countdown");

        const timer = setInterval(() => {
            seconds--;
            if (countdownEl) countdownEl.textContent = seconds;

            if (seconds <= 0) {
                clearInterval(timer);
                window.location.href = targetUrl;
            }
        }, 1000);