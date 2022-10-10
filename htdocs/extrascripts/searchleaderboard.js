const userCardTemplate = document.querySelector("[data-user-template]")
const userCardContainer = document.querySelector("[data-user-cards-container]")
const searchInput = document.querySelector("[data-search]")

let users = []

searchInput.addEventListener("input", e => {
  const value = e.target.value.toLowerCase()
  users.forEach(user => {
    const isVisible =
      user.name.toLowerCase().includes(value)
    user.element.classList.toggle("hide", !isVisible)
  })
})

fetch("https://gdlrrlist.com/api/v1/demons")
  .then(res => res.json())
  .then(real => {
    const data = Object.values(real)
    users = data.map(user => {
      const card = userCardTemplate.content.cloneNode(true).children[0]
      const header = card.querySelector("[data-header]")
      const body = card.querySelector("[data-body]")
      header.innerHTML = `<a href="https://gdlrrlist.com/search/level/${user.name}">${user.name}</a>`
      userCardContainer.append(card)
      return { name: user.name, element: card }
    })
  })