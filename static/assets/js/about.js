// Particle animation functionality
let particles = [];
let lastScrollTop = 0;
let scrollVelocity = 0;

function createParticle(options = {}) {
    const defaults = {
        minSize: 1,
        maxSize: 50,
        minSpeed: 0.1,
        maxSpeed: 0.3,
        minOpacity: 0.2,
        maxOpacity: 0.6,
        color: "rgba(76, 175, 80, 0.6)",
        blurAmount: 1.5,
        gravitational: true,
    };

    const settings = { ...defaults, ...options };

    const particle = document.createElement("div");
    particle.className = "particle";
    const size = Math.random() * (settings.maxSize - settings.minSize) + settings.minSize;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;

    let posX = Math.random() * window.innerWidth;
    let posY = Math.random() * window.innerHeight;
    particle.style.left = `${posX}px`;
    particle.style.top = `${posY}px`;

    const opacity = Math.random() * (settings.maxOpacity - settings.minOpacity) + settings.minOpacity;
    particle.style.backgroundColor = settings.color;
    particle.style.opacity = opacity;

    if (settings.blurAmount > 0) {
        particle.style.filter = `blur(${settings.blurAmount}px)`;
    }

    document.body.appendChild(particle);

    let speed = {
        x: (Math.random() - 0.5) * (settings.maxSpeed - settings.minSpeed) + settings.minSpeed,
        y: (Math.random() - 0.5) * (settings.maxSpeed - settings.minSpeed) + settings.minSpeed,
    };

    let wind = {
        x: (Math.random() - 0.5) * 0.5,
        y: (Math.random() - 0.5) * 0.5,
    };

    let gravity = Math.random() * 0.2;

    function updatePosition() {
        speed.y += gravity;
        speed.x += wind.x;
        speed.y += wind.y;

        speed.y += scrollVelocity * 0.1;

        if (speed.x > settings.maxSpeed) speed.x = settings.maxSpeed;
        if (speed.x < -settings.maxSpeed) speed.x = -settings.maxSpeed;
        if (speed.y > settings.maxSpeed) speed.y = settings.maxSpeed;
        if (speed.y < -settings.maxSpeed) speed.y = -settings.maxSpeed;

        posX += speed.x;
        posY += speed.y;

        if (posX < 0) posX = window.innerWidth;
        if (posX > window.innerWidth) posX = 0;
        if (posY < 0) posY = window.innerHeight;
        if (posY > window.innerHeight) posY = 0;

        particle.style.left = `${posX}px`;
        particle.style.top = `${posY}px`;

        requestAnimationFrame(updatePosition);
    }

    function changeWindAndGravity() {
        wind = {
            x: (Math.random() - 0.5) * 0.5,
            y: (Math.random() - 0.5) * 0.5,
        };
        gravity = Math.random() * 0.2;
    }

    updatePosition();
    setInterval(changeWindAndGravity, 2000);

    particle.addEventListener("mouseenter", () => {
        particle.style.transform = "scale(1.5)";
        particle.style.transition = "transform 0.3s ease-in-out";
    });

    particle.addEventListener("mouseleave", () => {
        particle.style.transform = "scale(1)";
    });

    return {
        element: particle,
        posX: posX,
        posY: posY,
        speed: speed,
    };
}

function animateBackground() {
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
        particles.push(createParticle());
    }

    document.addEventListener("mousemove", (e) => {
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        particles.forEach((particle) => {
            const rect = particle.element.getBoundingClientRect();
            const particleX = rect.left + rect.width / 2;
            const particleY = rect.top + rect.height / 2;

            const dx = mouseX - particleX;
            const dy = mouseY - particleY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 100) {
                const angle = Math.atan2(dy, dx);
                const force = (100 - distance) / 10;
                particle.element.style.transform = `translate(${Math.cos(angle) * force}px, ${Math.sin(angle) * force}px)`;
            } else {
                particle.element.style.transform = "translate(0, 0)";
            }
        });
    });

    window.addEventListener("scroll", () => {
        const st = window.pageYOffset || document.documentElement.scrollTop;
        if (st > lastScrollTop) {
            // downscroll code
            scrollVelocity = st - lastScrollTop;
        } else {
            // upscroll code
            scrollVelocity = st - lastScrollTop;
        }
        lastScrollTop = st <= 0 ? 0 : st; // For Mobile or negative scrolling
    });
}

window.addEventListener('load', animateBackground);