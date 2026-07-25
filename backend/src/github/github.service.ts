export async function getGithubUser(token: string) {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error("Invalid GitHub Personal Access Token");
  }

  return response.json();
}

export async function getUserRepositories(token: string) {
  const response = await fetch(
    "https://api.github.com/user/repos?sort=updated&per_page=100",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch repositories");
  }

  return response.json();
}