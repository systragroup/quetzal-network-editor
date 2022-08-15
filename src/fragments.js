import gql from 'graphql-tag'

export const userFragment = gql`
fragment UserFragment on UserNode {
  id
  fullName
}
`
export const categoryFragment = gql`
fragment CategoryFragment on CategoryNode {
  id
  name
}
`
export const postBasicFragment = gql`
${userFragment}
${categoryFragment}
fragment PostBasicFragment on PostNode {
  id
  title
  author {
    ...UserFragment
  }
  pubdate
  categories {
    edges {
      node {
        ...CategoryFragment
      }
    }
  }
}
`
export const postFullFragment = gql`
${postBasicFragment}
fragment PostFullFragment on PostNode {
  ...PostBasicFragment
  text
  comments {
    edges {
      node {
        id
        text
        date
        author {
          ...UserFragment
        }
      }
    }
  }
}
`
