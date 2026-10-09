//1. Usuário entra com o texto do que quer, e aperta para criar a timeline. Abrindo o modal.
<input
  type="text"
  className="create-timeline-panel__input"
  placeholder={placeholder ?? t("dashboard.createTimeline.placeholder")}
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  onKeyDown={(e) => e.key === "Enter" && handleOpenModal()} 
/>


//2. O modal abre, e aciona o hook useTimelineChat. 
const { 
  turns,      // a conversa: cada turno tem a mensagem da pessoa, a resposta da IA, quantos títulos vieram e o erro (se houve)
  draft,      // a timeline pronta para salvar (nome, tipo e títulos); null enquanto a primeira busca não terminou
  loading,    // true enquanto a IA está buscando a lista (na abertura ou num ajuste)
  input,      // o texto que a pessoa está digitando no campo do chat de ajustes
  setInput,   // atualiza o texto do campo a cada tecla
  saving,     // true enquanto a timeline está sendo gravada no Firebase
  saveError,  // a mensagem de erro se não foi possível salvar (senão null)
  send,       // envia a mensagem do campo: a IA responde e, se for um pedido de mudança, a lista é refeita
  save        // grava a timeline no Firebase (já seguida) e avisa o modal que terminou
 } = useTimelineChat(
    uid, // uid do usuário logado (se null o modal não abre, porque não tem como salvar)
    initialDescription, // o texto que a pessoa digitou no painel antes de abrir o modal
    categoryLock, // se a timeline é só de filmes, só de séries ou só de animes (ou undefined para não travar)
    onSaved // função a ser chamada quando a timeline é salva
);


// 3. O modal abre, e a primeira busca é feita. A IA responde com uma lista de títulos, que é mostrada na tela.
// Ciclo "criar timeline pela IA": a descrição vira uma lista -> o usuário ajusta conversando -> salvar (a timeline nasce seguida).
// usado no modal "criar timeline" (faixa "Criar uma nova timeline" de Filmes, Séries e Animes).
export const useTimelineChat = (uid: string, initialDescription: string, categoryLock: ContentType | undefined, onSaved: () => void) => {
  const { t } = useTranslation(); //traz as mensagens de erro em texto traduzido
  const [turns, setTurns] = useState<TimelineTurn[]>([{ message: initialDescription, reply: null, resultCount: null, error: null }]);
  const [draft, setDraft] = useState<ResolvedTimelineDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 1.2 Atualiza o último turno da conversa com a IA, adicionando a resposta, o resultado ou o erro
  const updateLastTurn = (patch: Partial<TimelineTurn>) =>
    setTurns((prev) => prev.map((turn, index) => (index === prev.length - 1 ? { ...turn, ...patch } : turn)));

  // 1.1 A busca (IA + TMDb): guarda a lista que a pessoa vê e devolve quantos títulos vieram. Serve para a abertura e para os ajustes.
  const search = async (description: string): Promise<number> => {
    const result = await resolveTimelineMovies(description, categoryLock);
    setDraft(result);
    return result.movies.length;
  };


  // 1. primeira resolução, ao abrir
  useEffect(() => {
    search(initialDescription) 
      .then((count) => updateLastTurn({ resultCount: count }))
      .catch((err) => {
        console.error("Erro ao processar timeline:", err);
        updateLastTurn({ error: err instanceof Error ? err.message : t("dashboard.createTimeline.processError") });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. ajuste pelo chat: a IA responde e, se for um pedido de mudança, a lista é refeita com todos os ajustes
  const send = async () => {
    const text = input.trim(); // mensagem do input do usuário, sem espaços no começo ou no fim
    if (!text || loading) return;

    setTurns([...turns, { message: text, reply: null, resultCount: null, error: null }]); // precisa disso?
    setInput(""); // limpa o campo de input
    setLoading(true);
    try {
      const chat = await respondToTimelineChat(turns.map((turn) => turn.message), draft?.movies ?? [], text); 
      // 2.1 Envia para a IA: todas as mensagens anteriores + a lista atual de títulos + a nova mensagem do usuário. A IA responde com uma resposta curta 
      // e diz se é um pedido de mudança na lista. (generateJSON do Gemini)
      
      
      const count = chat.isRefinement ? await search(combineMessages([...turns.map((turn) => turn.message), text])) : null;
      // 2.2 Se a IA disse que é um pedido de mudança, refaz a busca com todas as mensagens anteriores + a nova mensagem.
      // O count é só a quantidade de títulos encontrados nessa segunda busca. Se a mensagem for apenas uma pergunta ou comentário, 
      // isRefinement será false e a segunda busca não acontece.

      // 2.4 Atualiza o último turno da conversa com a IA, adicionando a resposta, o resultado ou o erro
      updateLastTurn({ reply: chat.reply, resultCount: count });
    } catch (err) {
      console.error("Erro na conversa da timeline:", err);
      updateLastTurn({ error: err instanceof Error ? err.message : t("dashboard.createTimeline.chatError") });
    } finally {
      setLoading(false);
    }
  };

  // 3. salvar
  const save = async () => {
    if (!draft || draft.movies.length === 0 || saving) return;
    setSaving(true); // true enquanto a timeline está sendo gravada no Firebase
    setSaveError(null); // a mensagem de erro se não foi possível salvar (senão null)
    try {
      await createTimeline(uid, draft.name, draft.types, draft.movies, { followed: true }); // cria a timeline no Firebase
      onSaved(); // fecha o modal e limpa o campo da faixa
    } catch (err) {
      console.error("Erro ao salvar timeline:", err);
      setSaveError(t("dashboard.createTimeline.saveError"));
    } finally {
      setSaving(false);
    }
  };

        // 3.1. Cria a timeline no Firebase, já seguida pelo usuário.
        export const createTimeline = async (
            uid: string,
            name: string,
            types: ContentType[],
            movies: TimelineMovie[],
            options: CreateTimelineOptions = {}
            ): Promise<string> => {
            const { awardSlug, awardEditionOrdinal, followed = false } = options;
            const ref = await addDoc(timelineCollection(uid), {
                name,
                types,
                movies,
                createdAt: serverTimestamp(),
                followed,
                ...(awardSlug && awardEditionOrdinal ? { awardSlug, awardEditionOrdinal } : {}),
            });
            return ref.id;
        };

  return {
    turns, // a conversa: cada turno tem a mensagem da pessoa, a resposta da IA, quantos títulos vieram e o erro (se houve)
    draft, // a timeline pronta para salvar (nome, tipo e títulos); null enquanto a primeira busca não terminou
    loading, // true enquanto a IA está buscando a lista (na abertura ou num ajuste)
    input, // o texto que a pessoa está digitando no campo do chat de ajustes
    setInput, // atualiza o texto do campo a cada tecla
    saving, // true enquanto a timeline está sendo gravada no Firebase
    saveError, // a mensagem de erro se não foi possível salvar (senão null)
    send, // envia a mensagem do campo: a IA responde e, se for um pedido de mudança, a lista é refeita
    save, // grava a timeline no Firebase (já seguida) e avisa o modal que terminou
  };
};
