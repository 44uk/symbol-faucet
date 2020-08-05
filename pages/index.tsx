import Link from 'next/link'
import Layout from '../components/Layout'
import { Button } from 'evergreen-ui'

const IndexPage = () => (
  <Layout title="Home | Next.js + TypeScript Example">
    <h1>Hello Next.js 👋</h1>
    <p>
      <Link href="/about">
        <a>About</a>
      </Link>
    </p>
    <p>
      <Button>I am using 🌲 Evergreen!</Button>
    </p>
  </Layout>
)

export default IndexPage
