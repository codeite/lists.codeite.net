#lists.codeite.net

GET /list/:user
Show all lists a user owns. Paged

GET /list/:user/:listId
Gets a list belonging to a user

PUT /list/:user/:listId
Create a new list

PUT /list/:user/:listId?v=:version
Overwrite a list

POST /list/:user/:listId?v=:version
Body {items: [...:newItems]}

GET /user/:user
Info about a user

## List
{
  id: id,
  owner: owner,
  meta: {

  },
  items: {

  }
}
