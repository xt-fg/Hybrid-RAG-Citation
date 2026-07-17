import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI render failed', error, info.componentStack);
  }

  private resetConversation = () => {
    localStorage.removeItem('source-lens.messages.v1');
    localStorage.removeItem('source-lens.messages.v2');
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="fatal-error-page">
        <div className="fatal-error-card">
          <span>界面恢复</span>
          <h1>这条消息没有正确显示</h1>
          <p>应用捕获到一个前端渲染错误。你可以清除损坏的本地会话后继续使用，知识库文档和 API 配置不会被删除。</p>
          <code>{this.state.error.message || '未知渲染错误'}</code>
          <button type="button" onClick={this.resetConversation}>清除本地会话并恢复</button>
        </div>
      </main>
    );
  }
}
