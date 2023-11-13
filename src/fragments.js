import gql from 'graphql-tag'

export const userFragment = gql`
fragment UserFragment on User {
  id
  fullName
}
`
export const categoryFragment = gql`
fragment CategoryFragment on Category {
  id
  name
}
`
export const postBasicFragment = gql`
${userFragment}
${categoryFragment}
fragment PostBasicFragment on Post {
  id
  title
  author {
    ...UserFragment
  }
  pubdate
  categories {
    ...CategoryFragment
  }
}
`
export const postFullFragment = gql`
${postBasicFragment}
fragment PostFullFragment on Post {
  ...PostBasicFragment
  text
  comments {
    id
    text
    date
    author {
      ...UserFragment
    }
  }
}
`
