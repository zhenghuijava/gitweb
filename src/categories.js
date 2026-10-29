// 领域分类体系：大类 → 小类（以 GitHub topic 为搜索键）
export const CATEGORIES = [
  {
    id: 'ai',
    name: 'AI / 机器学习',
    icon: '🤖',
    subs: [
      { id: 'llm', name: '大语言模型', topics: 'llm' },
      { id: 'agent', name: 'AI Agent', topics: 'ai-agent' },
      { id: 'rag', name: 'RAG / 检索增强', topics: 'rag' },
      { id: 'ml', name: '机器学习框架', topics: 'machine-learning' },
      { id: 'diffusion', name: '图像生成', topics: 'stable-diffusion,diffusion' },
      { id: 'speech', name: '语音识别', topics: 'speech-recognition' },
    ],
  },
  {
    id: 'frontend',
    name: '前端',
    icon: '🎨',
    subs: [
      { id: 'framework', name: '框架', topics: 'frontend-framework' },
      { id: 'ui', name: 'UI 组件库', topics: 'ui-components,component-library' },
      { id: 'css', name: 'CSS 工具', topics: 'css' },
      { id: 'state', name: '状态管理', topics: 'state-management' },
      { id: 'bundler', name: '构建工具', topics: 'bundler,build-tools' },
      { id: 'editor', name: '富文本/编辑器', topics: 'editor,rich-text-editor' },
    ],
  },
  {
    id: 'backend',
    name: '后端',
    icon: '⚙️',
    subs: [
      { id: 'api', name: 'API 框架', topics: 'api,rest-api' },
      { id: 'auth', name: '认证授权', topics: 'authentication' },
      { id: 'orm', name: 'ORM', topics: 'orm' },
      { id: 'micro', name: '微服务', topics: 'microservices' },
      { id: 'graphql', name: 'GraphQL', topics: 'graphql' },
    ],
  },
  {
    id: 'data',
    name: '数据库 / 数据',
    icon: '🗄️',
    subs: [
      { id: 'db', name: '数据库', topics: 'database' },
      { id: 'vector', name: '向量数据库', topics: 'vector-database' },
      { id: 'etl', name: '数据管道', topics: 'etl,data-pipeline' },
      { id: 'viz', name: '数据可视化', topics: 'data-visualization,visualization' },
    ],
  },
  {
    id: 'devops',
    name: 'DevOps / 云',
    icon: '🚀',
    subs: [
      { id: 'k8s', name: 'Kubernetes', topics: 'kubernetes' },
      { id: 'docker', name: '容器', topics: 'docker,containers' },
      { id: 'ci', name: 'CI/CD', topics: 'ci-cd,continuous-integration' },
      { id: 'iac', name: '基础设施即代码', topics: 'infrastructure-as-code,terraform' },
      { id: 'monitor', name: '监控观测', topics: 'monitoring,observability' },
    ],
  },
  {
    id: 'tools',
    name: '开发工具',
    icon: '🛠️',
    subs: [
      { id: 'cli', name: 'CLI 工具', topics: 'cli,cli-app' },
      { id: 'terminal', name: '终端', topics: 'terminal' },
      { id: 'git', name: 'Git 增强', topics: 'git,git-client' },
      { id: 'ide', name: '编辑器/IDE', topics: 'ide,code-editor' },
      { id: 'lsp', name: 'LSP / 补全', topics: 'language-server,lsp' },
    ],
  },
  {
    id: 'selfhosted',
    name: '自托管应用',
    icon: '🏠',
    subs: [
      { id: 'nas', name: '网盘/文件', topics: 'self-hosted,file-sharing' },
      { id: 'note', name: '笔记/知识库', topics: 'notes,knowledge-management' },
      { id: 'media', name: '媒体服务', topics: 'media-server,streaming' },
      { id: 'homelab', name: 'HomeLab', topics: 'homelab,selfhosted' },
      { id: 'collab', name: '协作办公', topics: 'collaboration,project-management' },
    ],
  },
  {
    id: 'security',
    name: '安全',
    icon: '🔐',
    subs: [
      { id: 'pentest', name: '渗透测试', topics: 'penetration-testing,security-tools' },
      { id: 'privacy', name: '隐私保护', topics: 'privacy,vpn' },
      { id: 'crypto', name: '密码学', topics: 'cryptography' },
    ],
  },
  {
    id: 'learn',
    name: '学习资源',
    icon: '📚',
    subs: [
      { id: 'book', name: '书籍/教程', topics: 'tutorial,book' },
      { id: 'algo', name: '算法', topics: 'algorithms,interview' },
      { id: 'awesome', name: 'Awesome 清单', topics: 'awesome,awesome-list' },
      { id: 'roadmap', name: '学习路线', topics: 'roadmap,learning' },
    ],
  },
]

export const LANGUAGES = [
  '', 'JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java',
  'C++', 'C#', 'C', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Dart', 'Shell', 'Zig', 'Lua', 'Vue', 'HTML', 'CSS', 'Jupyter Notebook', 'MDX',
]

// GitHub 官方语言色
export const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5', Go: '#00ADD8',
  Rust: '#dea584', Java: '#b07219', 'C++': '#f34b7d', 'C#': '#178600', C: '#555555',
  Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138', Kotlin: '#A97BFF',
  Dart: '#00B4AB', Shell: '#89e051', Zig: '#ec915c', Lua: '#000080',
  Vue: '#41b883', HTML: '#e34c26', CSS: '#563d7c', 'Jupyter Notebook': '#DA5B0B',
  MDX: '#fcb32c',
}

// 通过大类的默认小类
export function getDefaultSub(category) {
  return category.subs[0]
}
