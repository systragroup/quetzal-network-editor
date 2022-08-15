import gql from 'graphql-tag'
import {
  postBasicFragment,
  postFullFragment,
  userFragment,
  categoryFragment,
} from '@src/fragments.js'

export const getAllPostsQuery = gql`
${postBasicFragment}
query (
  $search: String
) {
  allPosts (
    search: $search
  ) {
    edges {
      node {
        ...PostBasicFragment
      }
    }
  }
}
`
export const getCategoryQuery = gql`
${postBasicFragment}
query (
  $id: ID!
  $search: String
) {
  category (id: $id) {
    name
    posts (
      search: $search
    ) {
      edges {
        node {
          ...PostBasicFragment
        }
      }
    }
  }
}
`
export const getPostQuery = gql`
${postFullFragment}
query ($id: ID!) {
  post(id: $id) {
    ...PostFullFragment
  }
}
`
export const getAllUsersQuery = gql`
${userFragment}
query {
  allUsers {
    edges {
      node {
        ...UserFragment
      }
    }
  }
}
`
export const getAllUsersAndCategoriesQuery = gql`
${userFragment}
${categoryFragment}
query {
  allUsers {
    edges {
      node {
        ...UserFragment
      }
    }
  }
  allCategories {
    edges {
      node {
        ...CategoryFragment
      }
    }
  }
}
`
export const createPostMutation = gql`
mutation (
  $title: String!
  $text: String!
  $authorId: ID!
  $categories: [CategoryInputType]
) {
  createPost(input: {
    title: $title
    text: $text
    authorId: $authorId
    categories: $categories
  }) {
    post {
      id
    }
  }
}
`
export const deletePostMutation = gql`
mutation ($id: ID!) {
  deletePost(input: {
    id: $id
  }) {
    __typename
  }
}
`
export const createCommentMutation = gql`
mutation (
  $postId: ID!
  $text: String!
  $authorId: ID!
) {
  createComment(input: {
    postId: $postId
    text: $text
    authorId: $authorId
  }) {
    __typename
  }
}
`
export const updateCommentMutation = gql`
mutation (
  $id: ID!
  $text: String!
  $authorId: ID!
) {
  updateComment(input: {
    id: $id
    text: $text
    authorId: $authorId
  }) {
    __typename
  }
}
`
export const deleteCommentMutation = gql`
mutation (
  $id: ID!
) {
  deleteComment(input: {
    id: $id
  }) {
    __typename
  }
}
`
