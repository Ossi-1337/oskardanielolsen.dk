const projectGrid = document.querySelector('#project-grid');
const projectStatus = document.querySelector('#project-status');
const year = document.querySelector('#year');

year.textContent = new Date().getFullYear();

function formatRepositoryName(name) {
    return name
        .split(/[-_]+/)
        .map((part) =>
            part === part.toLowerCase()
                ? part.charAt(0).toUpperCase() + part.slice(1)
                : part
        )
        .join(' ');
}

function createProjectCard(repository) {
    const displayName = formatRepositoryName(repository.name);
    const article = document.createElement('article');
    article.className = 'project-card';

    const topline = document.createElement('div');
    topline.className = 'project-topline';

    const heading = document.createElement('h3');
    const titleLink = document.createElement('a');
    titleLink.href = repository.html_url;
    titleLink.textContent = displayName;
    heading.append(titleLink);

    const language = document.createElement('span');
    language.textContent = repository.language || 'Project';
    topline.append(heading, language);

    const description = document.createElement('p');
    description.textContent = repository.description || 'Open-source project on GitHub.';

    const projectLink = document.createElement('a');
    projectLink.className = 'card-link';
    projectLink.href = repository.html_url;
    projectLink.setAttribute('aria-label', `View ${displayName} on GitHub`);
    projectLink.append('View project ');

    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    projectLink.append(arrow);

    article.append(topline, description, projectLink);
    return article;
}

async function loadProjects() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(
            '/api/projects',
            {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            }
        );

        if (!response.ok) {
            throw new Error(`GitHub request failed with ${response.status}`);
        }

        const repositories = await response.json();

        if (!Array.isArray(repositories) || repositories.length === 0) {
            return;
        }

        projectGrid.replaceChildren(...repositories.map(createProjectCard));
        projectStatus.textContent = 'Updated from GitHub.';
    } catch {
        projectStatus.textContent = 'Showing selected projects.';
    } finally {
        window.clearTimeout(timeout);
    }
}

loadProjects();
