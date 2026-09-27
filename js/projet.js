(function () {
    "use strict";

    function setupDeferredImages() {
        const images = document.querySelectorAll("img[data-src]");

        function loadImage(image) {
            const source = image.dataset.src;
            if (!source) return;
            image.loading = "eager";
            image.src = source;
            image.removeAttribute("data-src");
        }

        if (!("IntersectionObserver" in window)) {
            images.forEach(loadImage);
            return;
        }

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                loadImage(entry.target);
                observer.unobserve(entry.target);
            });
        }, { rootMargin: "180px 80px" });

        images.forEach(function (image) {
            observer.observe(image);
        });
    }

    function setupSiteNavigation() {
        const navigation = document.querySelector(".premium-nav");
        const toggle = navigation ? navigation.querySelector("[data-site-nav-toggle]") : null;
        const menu = navigation ? navigation.querySelector("#navbarCollapse") : null;

        if (!navigation || !toggle || !menu) return;

        function closeMenu() {
            menu.classList.remove("show");
            toggle.setAttribute("aria-expanded", "false");
        }

        toggle.addEventListener("click", function () {
            const isOpen = menu.classList.toggle("show");
            toggle.setAttribute("aria-expanded", String(isOpen));
        });

        menu.addEventListener("click", function (event) {
            if (event.target.closest("a")) closeMenu();
        });

        document.addEventListener("click", function (event) {
            if (!navigation.contains(event.target)) closeMenu();
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") closeMenu();
        });

        window.addEventListener("resize", function () {
            if (window.innerWidth >= 992) closeMenu();
        }, { passive: true });
    }

    function setupCarousels() {
        document.querySelectorAll(".carousel-shell").forEach(function (shell) {
            const carousel = shell.querySelector("[data-carousel]");
            const previous = shell.querySelector("[data-carousel-prev]");
            const next = shell.querySelector("[data-carousel-next]");

            if (!carousel || !previous || !next) return;

            let updateFrame = 0;
            let pointerStartX = 0;
            let pointerStartY = 0;
            let pointerMoved = false;

            function getScrollDistance() {
                const firstCard = carousel.querySelector(".proof-card");
                if (!firstCard) return carousel.clientWidth;

                const styles = window.getComputedStyle(carousel);
                const gap = parseFloat(styles.columnGap || styles.gap) || 0;
                const cardWidth = firstCard.getBoundingClientRect().width;
                const cardStep = cardWidth + gap;
                const visibleCards = Math.max(1, Math.floor((carousel.clientWidth + gap) / cardStep));

                return cardStep * visibleCards;
            }

            function updateButtons() {
                const maximum = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
                previous.disabled = carousel.scrollLeft <= 2;
                next.disabled = carousel.scrollLeft >= maximum - 2;
            }

            function queueButtonUpdate() {
                window.cancelAnimationFrame(updateFrame);
                updateFrame = window.requestAnimationFrame(updateButtons);
            }

            function move(direction) {
                carousel.scrollBy({
                    left: direction * getScrollDistance(),
                    behavior: "smooth"
                });
            }

            previous.addEventListener("click", function () {
                move(-1);
            });

            next.addEventListener("click", function () {
                move(1);
            });

            carousel.addEventListener("scroll", queueButtonUpdate, { passive: true });

            carousel.addEventListener("keydown", function (event) {
                if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    move(-1);
                }
                if (event.key === "ArrowRight") {
                    event.preventDefault();
                    move(1);
                }
            });

            carousel.addEventListener("pointerdown", function (event) {
                pointerStartX = event.clientX;
                pointerStartY = event.clientY;
                pointerMoved = false;
            }, { passive: true });

            carousel.addEventListener("pointermove", function (event) {
                const horizontalDistance = Math.abs(event.clientX - pointerStartX);
                const verticalDistance = Math.abs(event.clientY - pointerStartY);
                if (horizontalDistance > 8 || verticalDistance > 8) pointerMoved = true;
            }, { passive: true });

            carousel.addEventListener("click", function (event) {
                if (!pointerMoved) return;
                event.preventDefault();
                event.stopPropagation();
                pointerMoved = false;
            }, true);

            if ("ResizeObserver" in window) {
                new ResizeObserver(queueButtonUpdate).observe(carousel);
            } else {
                window.addEventListener("resize", queueButtonUpdate, { passive: true });
            }

            updateButtons();
        });
    }

    function setupFilters() {
        const buttons = document.querySelectorAll(".filter-button[data-filter]");
        const cards = document.querySelectorAll(".work-card[data-category]");

        buttons.forEach(function (button) {
            button.addEventListener("click", function () {
                const filter = button.dataset.filter;

                buttons.forEach(function (item) {
                    const active = item === button;
                    item.classList.toggle("is-active", active);
                    item.setAttribute("aria-pressed", String(active));
                });

                cards.forEach(function (card) {
                    card.hidden = filter !== "all" && card.dataset.category !== filter;
                });
            });
        });
    }

    function setupImageDialog() {
        const dialog = document.getElementById("image-dialog");
        const image = document.getElementById("proof-large");
        const closeButton = dialog ? dialog.querySelector("[data-close-image]") : null;

        if (!dialog || !image) return;

        document.addEventListener("click", function (event) {
            const trigger = event.target.closest(".proof-card[data-full]");
            if (!trigger) return;

            image.src = trigger.dataset.full;
            image.alt = trigger.dataset.alt || trigger.querySelector("img")?.alt || "Capture agrandie";

            if (typeof dialog.showModal === "function") {
                dialog.showModal();
            } else {
                window.open(image.src, "_blank", "noopener");
            }
        });

        if (closeButton) {
            closeButton.addEventListener("click", function () {
                dialog.close();
            });
        }

        dialog.addEventListener("click", function (event) {
            if (event.target === dialog) dialog.close();
        });

        dialog.addEventListener("close", function () {
            image.removeAttribute("src");
            image.alt = "";
        });
    }

    function setupPdfReader() {
        const dialog = document.getElementById("pdf-dialog");
        const title = document.getElementById("reader-title");
        const readerBody = document.getElementById("reader-body");
        const pagesContainer = document.getElementById("reader-pages");
        const status = document.getElementById("reader-status");
        const fallback = document.getElementById("reader-fallback");
        const fallbackMessage = document.getElementById("reader-fallback-message");
        const pageLabel = document.getElementById("reader-page");
        const closeButton = dialog ? dialog.querySelector("[data-close-reader]") : null;

        if (!dialog || !title || !readerBody || !pagesContainer || !status || !fallback || !fallbackMessage || !pageLabel) {
            return;
        }

        let pdfJsPromise = null;
        let pdfWorkerPromise = null;
        let loadingTask = null;
        let pdfDocument = null;
        let renderObserver = null;
        let visibilityObserver = null;
        let resizeTimer = null;
        let requestNumber = 0;
        let currentPage = 1;
        let estimatedAspectRatio = 1.414;
        const renderTasks = new Map();
        const visiblePages = new Map();

        function loadClassicScript(url, isReady, errorMessage) {
            if (isReady()) return Promise.resolve();

            return new Promise(function (resolve, reject) {
                const script = document.createElement("script");
                script.src = url;
                script.onload = function () {
                    if (!isReady()) {
                        reject(new Error(errorMessage));
                        return;
                    }
                    resolve();
                };
                script.onerror = function () {
                    reject(new Error(errorMessage));
                };
                document.head.appendChild(script);
            });
        }

        function loadPdfJs() {
            if (!pdfJsPromise) {
                const libraryUrl = new URL("js/vendor/pdf.min.js", document.baseURI).href;
                pdfJsPromise = loadClassicScript(
                    libraryUrl,
                    function () { return Boolean(window.pdfjsLib); },
                    "PDF.js n'a pas pu être initialisé"
                ).then(async function () {
                    if (window.location.protocol === "file:" && !window.pdfjsWorker) {
                        const workerUrl = new URL("js/vendor/pdf.worker.min.js", document.baseURI).href;
                        if (!pdfWorkerPromise) {
                            pdfWorkerPromise = loadClassicScript(
                                workerUrl,
                                function () { return Boolean(window.pdfjsWorker); },
                                "Le moteur de rendu PDF.js n'a pas pu être initialisé"
                            );
                        }
                        await pdfWorkerPromise;
                    }

                    return window.pdfjsLib;
                }).catch(function (error) {
                    pdfJsPromise = null;
                    throw error;
                });
            }

            return pdfJsPromise;
        }

        function decodePdfBundle(base64) {
            const binary = window.atob(base64);
            const bytes = new Uint8Array(binary.length);

            for (let index = 0; index < binary.length; index += 1) {
                bytes[index] = binary.charCodeAt(index);
            }

            const signature = String.fromCharCode.apply(null, bytes.subarray(0, 5));
            if (signature !== "%PDF-") throw new Error("Le document chargé n'est pas un PDF valide");

            return bytes;
        }

        function loadPdfBundle(documentId) {
            const registry = window.__NOBILIS_PDF_BUNDLES__ || (window.__NOBILIS_PDF_BUNDLES__ = Object.create(null));

            return new Promise(function (resolve, reject) {
                const script = document.createElement("script");
                script.src = new URL("js/pdf-data/" + documentId + ".js", document.baseURI).href;
                script.onload = function () {
                    try {
                        const encodedPdf = registry[documentId];
                        if (!encodedPdf) throw new Error("Données du document introuvables");
                        delete registry[documentId];
                        resolve(decodePdfBundle(encodedPdf));
                    } catch (error) {
                        reject(error);
                    } finally {
                        script.remove();
                    }
                };
                script.onerror = function () {
                    script.remove();
                    reject(new Error("Le document n'a pas pu être chargé"));
                };
                document.head.appendChild(script);
            });
        }

        function availablePageWidth() {
            return Math.min(820, Math.max(280, readerBody.clientWidth - 22));
        }

        function updatePageLabel() {
            pageLabel.textContent = pdfDocument
                ? "Page " + currentPage + " / " + pdfDocument.numPages
                : "Page — / —";
        }

        function setLoading(message) {
            status.textContent = message;
            status.hidden = false;
            pagesContainer.hidden = true;
            fallback.hidden = true;
            fallbackMessage.textContent = "Ce document ne peut pas être affiché dans le lecteur.";
        }

        function disconnectObservers() {
            if (renderObserver) renderObserver.disconnect();
            if (visibilityObserver) visibilityObserver.disconnect();
            renderObserver = null;
            visibilityObserver = null;
            visiblePages.clear();
        }

        function cancelRenders() {
            renderTasks.forEach(function (task) { task.cancel(); });
            renderTasks.clear();
        }

        function showFallback(error) {
            disconnectObservers();
            cancelRenders();
            status.hidden = true;
            pagesContainer.hidden = true;
            fallback.hidden = false;
            fallbackMessage.textContent = "Ce document ne peut pas être affiché dans le lecteur.";
            pdfDocument = null;
            updatePageLabel();
            console.warn("Lecteur PDF NOBILIS :", error && error.message ? error.message : error);
        }

        function createPagePlaceholders() {
            const width = availablePageWidth();
            const estimatedHeight = Math.round(width * estimatedAspectRatio);
            const fragment = document.createDocumentFragment();

            pagesContainer.replaceChildren();

            for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
                const pageElement = document.createElement("section");
                const canvas = document.createElement("canvas");

                pageElement.className = "reader-page";
                pageElement.dataset.page = String(pageNumber);
                pageElement.dataset.state = "empty";
                pageElement.dataset.aspect = String(estimatedAspectRatio);
                pageElement.style.minHeight = estimatedHeight + "px";

                canvas.width = 0;
                canvas.height = 0;
                canvas.hidden = true;
                canvas.setAttribute("aria-label", "Page " + pageNumber + " du document");
                pageElement.appendChild(canvas);
                fragment.appendChild(pageElement);
            }

            pagesContainer.appendChild(fragment);
            pagesContainer.hidden = false;
            readerBody.scrollTop = 0;
        }

        function releaseDistantPages(centerPage) {
            pagesContainer.querySelectorAll('.reader-page[data-state="rendered"]').forEach(function (pageElement) {
                const pageNumber = Number(pageElement.dataset.page);
                if (Math.abs(pageNumber - centerPage) <= 5) return;

                const canvas = pageElement.querySelector("canvas");
                canvas.width = 0;
                canvas.height = 0;
                canvas.removeAttribute("style");
                canvas.hidden = true;
                pageElement.dataset.state = "empty";
            });
        }

        async function renderPage(pageNumber) {
            if (!pdfDocument) return;

            const pageElement = pagesContainer.children[pageNumber - 1];
            if (!pageElement || pageElement.dataset.state === "loading" || pageElement.dataset.state === "rendered") return;

            const activeDocument = pdfDocument;
            const canvas = pageElement.querySelector("canvas");
            pageElement.dataset.state = "loading";

            try {
                const page = await activeDocument.getPage(pageNumber);
                if (pdfDocument !== activeDocument || !pageElement.isConnected) return;

                const naturalViewport = page.getViewport({ scale: 1 });
                const cssScale = Math.min(1.6, availablePageWidth() / naturalViewport.width);
                const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
                const viewport = page.getViewport({ scale: cssScale * pixelRatio });
                const cssWidth = Math.floor(viewport.width / pixelRatio);
                const cssHeight = Math.floor(viewport.height / pixelRatio);
                const context = canvas.getContext("2d", { alpha: false });

                if (!context) throw new Error("Canvas indisponible");

                pageElement.dataset.aspect = String(naturalViewport.height / naturalViewport.width);
                pageElement.style.minHeight = cssHeight + "px";
                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);
                canvas.style.width = cssWidth + "px";
                canvas.style.height = cssHeight + "px";

                const task = page.render({ canvasContext: context, viewport: viewport });
                renderTasks.set(pageNumber, task);
                await task.promise;

                if (pdfDocument !== activeDocument || !pageElement.isConnected) return;
                canvas.hidden = false;
                pageElement.dataset.state = "rendered";
                releaseDistantPages(currentPage);
            } catch (error) {
                if (error && error.name === "RenderingCancelledException") {
                    if (pageElement.isConnected) pageElement.dataset.state = "empty";
                    return;
                }

                if (pageElement.isConnected) {
                    pageElement.dataset.state = "error";
                    const message = document.createElement("p");
                    message.className = "reader-page-error";
                    message.textContent = "Cette page ne peut pas être affichée.";
                    pageElement.appendChild(message);
                }
            } finally {
                renderTasks.delete(pageNumber);
            }
        }

        function selectCurrentVisiblePage() {
            let selectedPage = currentPage;
            let bestRatio = -1;
            let bestTop = Infinity;

            visiblePages.forEach(function (visibility, pageNumber) {
                const topDistance = Math.abs(visibility.top);
                if (visibility.ratio > bestRatio || (visibility.ratio === bestRatio && topDistance < bestTop)) {
                    selectedPage = pageNumber;
                    bestRatio = visibility.ratio;
                    bestTop = topDistance;
                }
            });

            if (selectedPage !== currentPage) {
                currentPage = selectedPage;
                updatePageLabel();
                releaseDistantPages(currentPage);
            }
        }

        function observePages() {
            disconnectObservers();

            renderObserver = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) renderPage(Number(entry.target.dataset.page));
                });
            }, {
                root: readerBody,
                rootMargin: "1000px 0px",
                threshold: 0
            });

            visibilityObserver = new IntersectionObserver(function (entries) {
                const rootTop = readerBody.getBoundingClientRect().top;
                entries.forEach(function (entry) {
                    const pageNumber = Number(entry.target.dataset.page);
                    if (entry.isIntersecting) {
                        visiblePages.set(pageNumber, {
                            ratio: entry.intersectionRatio,
                            top: entry.boundingClientRect.top - rootTop
                        });
                    } else {
                        visiblePages.delete(pageNumber);
                    }
                });
                selectCurrentVisiblePage();
            }, {
                root: readerBody,
                threshold: [0, .1, .25, .5, .75, 1]
            });

            pagesContainer.querySelectorAll(".reader-page").forEach(function (pageElement) {
                renderObserver.observe(pageElement);
                visibilityObserver.observe(pageElement);
            });
        }

        function rerenderAfterResize() {
            if (!dialog.open || !pdfDocument) return;

            const anchorPage = currentPage;
            const width = availablePageWidth();
            disconnectObservers();
            cancelRenders();

            pagesContainer.querySelectorAll(".reader-page").forEach(function (pageElement) {
                const canvas = pageElement.querySelector("canvas");
                const aspect = Number(pageElement.dataset.aspect) || estimatedAspectRatio;
                pageElement.style.minHeight = Math.round(width * aspect) + "px";
                pageElement.dataset.state = "empty";
                pageElement.querySelector(".reader-page-error")?.remove();
                canvas.width = 0;
                canvas.height = 0;
                canvas.removeAttribute("style");
                canvas.hidden = true;
            });

            const anchorElement = pagesContainer.children[anchorPage - 1];
            if (anchorElement) readerBody.scrollTop = anchorElement.offsetTop - pagesContainer.offsetTop;
            observePages();
            renderPage(anchorPage);
        }

        async function openDocument(button) {
            const documentId = button.dataset.document;
            if (!documentId || !/^doc-\d{2}$/.test(documentId)) return;
            if (typeof dialog.showModal !== "function") return;

            requestNumber += 1;
            const activeRequest = requestNumber;

            title.textContent = button.dataset.title || "Document académique";
            currentPage = 1;
            pdfDocument = null;
            setLoading("Chargement du document…");
            updatePageLabel();

            if (!dialog.open) dialog.showModal();

            try {
                const pdfjsLib = await loadPdfJs();
                if (activeRequest !== requestNumber) return;

                pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("js/vendor/pdf.worker.min.js", document.baseURI).href;

                const bytes = await loadPdfBundle(documentId);
                if (activeRequest !== requestNumber) return;

                loadingTask = pdfjsLib.getDocument({ data: bytes });
                pdfDocument = await loadingTask.promise;
                if (activeRequest !== requestNumber) return;

                const firstPage = await pdfDocument.getPage(1);
                const firstViewport = firstPage.getViewport({ scale: 1 });
                estimatedAspectRatio = firstViewport.height / firstViewport.width;

                createPagePlaceholders();
                currentPage = 1;
                updatePageLabel();
                await renderPage(1);
                if (activeRequest !== requestNumber) return;

                status.hidden = true;
                fallback.hidden = true;
                observePages();
            } catch (error) {
                if (activeRequest !== requestNumber) return;
                showFallback(error);
            }
        }

        function cleanupReader() {
            requestNumber += 1;
            disconnectObservers();
            cancelRenders();

            if (loadingTask) {
                loadingTask.destroy();
                loadingTask = null;
            }

            pdfDocument = null;
            currentPage = 1;
            estimatedAspectRatio = 1.414;
            pagesContainer.replaceChildren();
            pagesContainer.hidden = true;
            fallback.hidden = true;
            status.textContent = "Chargement du document…";
            status.hidden = false;
            fallbackMessage.textContent = "Ce document ne peut pas être affiché dans le lecteur.";
            updatePageLabel();
        }

        document.addEventListener("click", function (event) {
            const button = event.target.closest(".js-open-pdf[data-document]");
            if (button) openDocument(button);
        });

        if (closeButton) {
            closeButton.addEventListener("click", function () {
                dialog.close();
            });
        }

        dialog.addEventListener("click", function (event) {
            if (event.target === dialog) dialog.close();
        });

        dialog.addEventListener("close", cleanupReader);

        pagesContainer.addEventListener("contextmenu", function (event) {
            if (event.target.closest("canvas")) event.preventDefault();
        });

        pagesContainer.addEventListener("dragstart", function (event) {
            if (event.target.closest("canvas")) event.preventDefault();
        });

        window.addEventListener("resize", function () {
            if (!dialog.open || !pdfDocument) return;
            window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(rerenderAfterResize, 180);
        }, { passive: true });
    }

    function setupWhatsAppForm() {
        const form = document.getElementById("project-whatsapp-form");

        if (!form) return;

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            if (!form.reportValidity()) return;

            const data = new FormData(form);
            const message = [
                "Bonjour Nobilis,",
                "",
                "Je souhaite demander une analyse académique.",
                "",
                `Nom : ${String(data.get("name") || "").trim()}`,
                `Email : ${String(data.get("email") || "").trim()}`,
                `Sujet du mémoire : ${String(data.get("subject") || "").trim()}`,
                `Détails : ${String(data.get("message") || "").trim()}`
            ].join("\n");
            const whatsappUrl = `https://wa.me/22994776256?text=${encodeURIComponent(message)}`;
            const whatsappWindow = window.open(whatsappUrl, "_blank", "noopener");

            if (whatsappWindow) whatsappWindow.opener = null;
        });
    }

    setupSiteNavigation();
    setupDeferredImages();
    setupCarousels();
    setupFilters();
    setupImageDialog();
    setupPdfReader();
    setupWhatsAppForm();
})();
