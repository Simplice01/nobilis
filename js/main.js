(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", function () {
        const spinner = document.getElementById("spinner");
        if (spinner) spinner.classList.remove("show");

        const navigation = document.querySelector(".premium-nav");
        const navToggle = navigation ? navigation.querySelector("[data-site-nav-toggle], [data-bs-target='#navbarCollapse']") : null;
        const navMenu = navigation ? navigation.querySelector("#navbarCollapse") : null;
        const backToTop = document.querySelector(".back-to-top");

        function updateScrollUi() {
            const isScrolled = window.scrollY > 300;
            if (navigation) navigation.classList.toggle("is-scrolled", window.scrollY > 12);
            if (backToTop) backToTop.style.display = isScrolled ? "flex" : "none";
        }

        if (navToggle && navMenu) {
            navToggle.addEventListener("click", function () {
                const isOpen = navMenu.classList.toggle("show");
                navToggle.setAttribute("aria-expanded", String(isOpen));
            });

            navMenu.querySelectorAll("a").forEach(function (link) {
                link.addEventListener("click", function () {
                    navMenu.classList.remove("show");
                    navToggle.setAttribute("aria-expanded", "false");
                });
            });
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
