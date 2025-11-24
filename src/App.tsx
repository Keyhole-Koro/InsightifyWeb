import { NestedGraphEditor } from '@/components/NestedGraphEditor/NestedGraphEditor';
import { sampleGraph } from '@/data/sampleGraph';
// @ts-ignore
import 'reactflow/dist/style.css';

const App = () => {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <NestedGraphEditor initialGraph={sampleGraph} />
    </div>
  );
};

export default App;
