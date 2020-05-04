class CountdownTimer {
    constructor(limit, completed){
        // Warning occurs at 10s
        const WARNING_THRESHOLD = 10;
        // Alert occurs at 5s
        const ALERT_THRESHOLD = 5;

        this.COLOR_CODES = {
            info: {
              color: "green"
            },
            warning: {
              color: "orange",
              threshold: WARNING_THRESHOLD
            },
            alert: {
              color: "red",
              threshold: ALERT_THRESHOLD
            }
          };

        this.timeLimit = limit;

        this.timePassed = 0;
        this.timeLeft = this.timeLimit;
        this.remainingPathColor = this.COLOR_CODES.info.color;
        this.completed = completed;
    }

    formatTime(time) {
        const minutes = Math.floor(time / 60);

        let seconds = time % 60;

        if (seconds < 10){
            seconds = `0${seconds}`;
        }

        return `${minutes}:${seconds}`;
    }

    calculateTimeFraction() {
        const rawTimeFraction = this.timeLeft / this.timeLimit;
        return rawTimeFraction - (1 / this.timeLimit) * (1 - rawTimeFraction);
    }

    setCircleDasharray() {
        this.circleDasharray = `${(
            this.calculateTimeFraction() * 283
          ).toFixed(0)} 283`;
          document
            .getElementById("base-timer-path-remaining")
            .setAttribute("stroke-dasharray", this.circleDasharray);
    }

    setRemainingPathColor() {
        const { alert, warning, info } = this.COLOR_CODES;
        // If the remaining time is less than or equal to 5, remove the "warning" class and apply the "alert" class.
        if (this.timeLeft <= alert.threshold) {
            document
            .getElementById("base-timer-path-remaining")
            .classList.remove(warning.color);
            document
            .getElementById("base-timer-path-remaining")
            .classList.add(alert.color);

        // If the remaining time is less than or equal to 10, remove the base color and apply the "warning" class.
        } else if (this.timeLeft <= warning.threshold) {
            document
            .getElementById("base-timer-path-remaining")
            .classList.remove(info.color);
            document
            .getElementById("base-timer-path-remaining")
            .classList.add(warning.color);
        }
    }

    render(){
        document.getElementById("timerDiv").innerHTML = `
        <div class="base-timer">
          <svg class="base-timer__svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <g class="base-timer__circle">
              <circle class="base-timer__path-elapsed" cx="50" cy="50" r="45"></circle>
              <path
                id="base-timer-path-remaining"
                stroke-dasharray="283"
                class="base-timer__path-remaining ${this.remainingPathColor}"
                d="
                  M 50, 50
                  m -45, 0
                  a 45,45 0 1,0 90,0
                  a 45,45 0 1,0 -90,0
                "
              ></path>
            </g>
          </svg>
          <span id="base-timer-label" class="base-timer__label">
            ${this.formatTime(this.timeLeft)}
          </span>
        </div>
        `;
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.timeLeft <= 1){
                clearInterval(this.timerInterval);
                document.getElementById("timerDiv").innerHTML = "";
                document.getElementById("timer__fade").style.display = "none";
            } else {
                this.timePassed += 1;
                this.timeLeft = this.timeLimit - this.timePassed;

                document.getElementById("base-timer-label").innerHTML = this.formatTime(this.timeLeft);

                this.setCircleDasharray();
                this.setRemainingPathColor();
            }
        }, 1000);
    }

    start() {
        document.getElementById("timer__fade").style.display = "block";
        this.render();
        this.startTimer();
    }
}

function startCountdown(time){
    var countDownTimer = new CountdownTimer(time);
    countDownTimer.start();
}