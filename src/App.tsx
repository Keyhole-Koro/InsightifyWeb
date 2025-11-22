import { ReactFlowProvider } from 'reactflow';
import NestedFlow from './NestedFlow';
import 'reactflow/dist/style.css';

const App = () => {
  return (
    <ReactFlowProvider>
      <main className="app-shell">
        <section className="panel">
          <h1>ネストされた React Flow</h1>
          <p>
            任意のノードをクリックすると、そのノードが保持するグラフがノード内部に表示されます。
            最初にクリックしたノードは他のノードよりも大きく強調されます。
          </p>
        </section>
        <section className="panel fill">
          <NestedFlow />
        </section>
      </main>
    </ReactFlowProvider>
  );
};

export default App;
