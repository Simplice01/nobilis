(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", function () {
        const spinner = document.getElementById("spinner");
        if (spinner) {
            window.setTimeout(function () {
                spinner.classList.remove("show");
            }, 1);
        }

        const sticky = document.querySelector(".sticky-top");
        const backToTop = document.querySelector(".back-to-top");

        function updateScrollUi() {
            const isScrolled = window.scrollY > 300;
            if (sticky) sticky.style.top = isScrolled ? "0px" : "-100px";
            if (backToTop) backToTop.style.display = isScrolled ? "flex" : "none";
        }

        updateScrollUi();
        window.addEventListener("scroll", updateScrollUi, { passive: true });

        if (backToTop) {
            backToTop.addEventListener("click", function (event) {
                event.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        }
    });
})();
