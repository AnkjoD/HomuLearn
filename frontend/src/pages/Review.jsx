import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Stack,
  TextField,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  MenuItem,
  Select,
  InputLabel,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import {
  fetchDecks,
  createDeck,
  deleteDeck,
  fetchCards,
  createCard,
  reviewCard,
  deleteCard,
} from "../api/flashcards";

const QUIZ = [
  {
    id: "q1",
    question: "lim(x→0) sin(x)/x = ?",
    options: ["0", "1", "∞", "Không tồn tại"],
    correct: 1,
    subject: "Giải tích",
  },
  {
    id: "q2",
    question: "Đơn vị lực trong SI?",
    options: ["Joule", "Watt", "Newton", "Pascal"],
    correct: 2,
    subject: "Vật lý",
  },
];

function FlashcardView({ cards, deckTitle, onReview, reviewing }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    setIdx(0);
    setFlipped(false);
  }, [cards.length, deckTitle]);

  if (cards.length === 0) return null;

  if (idx >= cards.length) {
    return (
      <Box textAlign="center" py={6} data-testid="flashcard-complete">
        <Typography variant="h5" fontWeight={700} mb={1}>
          Hoàn thành! 🎉
        </Typography>
        <Typography color="text.secondary" mb={3}>
          Bạn đã ôn xong {cards.length} thẻ trong bộ "{deckTitle}".
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            setIdx(0);
            setFlipped(false);
          }}
        >
          Ôn lại từ đầu
        </Button>
      </Box>
    );
  }

  const card = cards[idx];
  const handleAnswer = async (remembered) => {
    const ok = await onReview(card.id, remembered);
    if (ok) {
      setFlipped(false);
      setTimeout(() => setIdx((i) => i + 1), 150);
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
          mb: 1.5,
          alignItems: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {idx + 1} / {cards.length}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={`Chu kỳ: ${card.intervalDays ?? 0} ngày`}
            size="small"
            variant="outlined"
          />
          <Chip
            label={deckTitle}
            size="small"
            variant="outlined"
            sx={{
              fontWeight: 600,
              color: "primary.main",
              borderColor: "primary.main",
            }}
          />
        </Stack>
      </Box>
      <LinearProgress
        variant="determinate"
        value={(idx / cards.length) * 100}
        sx={{ mb: 4, height: 6, borderRadius: 3 }}
      />
      <Box
        sx={{
          perspective: 1000,
          mb: 4,
          cursor: "pointer",
          width: "100%",
          minHeight: 260,
          position: "relative",
        }}
        onClick={() => setFlipped((f) => !f)}
        data-testid="flashcard-flip-area"
      >
        <Box
          sx={{
            width: "100%",
            height: "100%",
            position: "absolute",
            inset: 0,
            transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          <Paper
            elevation={0}
            sx={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              p: 4,
              textAlign: "center",
              borderRadius: "16px",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              mb={2}
              fontWeight={600}
              letterSpacing={1}
            >
              CÂU HỎI
            </Typography>
            <Typography variant="h5" fontWeight={600} lineHeight={1.5}>
              {card.frontText}
            </Typography>
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ position: "absolute", bottom: 16 }}
            >
              Nhấn để lật thẻ
            </Typography>
          </Paper>
          <Paper
            elevation={0}
            sx={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              p: 4,
              textAlign: "center",
              borderRadius: "16px",
              border: "1px solid",
              borderColor: "primary.main",
              bgcolor: "primary.main",
              color: "primary.contrastText",
              transform: "rotateY(180deg)",
              boxShadow: "0 8px 24px rgba(15,76,129,0.2)",
            }}
          >
            <Typography
              variant="caption"
              mb={2}
              fontWeight={600}
              letterSpacing={1}
              sx={{ opacity: 0.8 }}
            >
              ĐÁP ÁN
            </Typography>
            <Typography variant="h5" fontWeight={600} lineHeight={1.5}>
              {card.backText}
            </Typography>
          </Paper>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          justifyContent: "center",
          opacity: flipped ? 1 : 0,
          transition: "opacity 0.3s",
          pointerEvents: flipped ? "auto" : "none",
        }}
      >
        <Button
          variant="outlined"
          color="error"
          startIcon={<CancelRoundedIcon />}
          disabled={reviewing}
          onClick={(e) => {
            e.stopPropagation();
            handleAnswer(false);
          }}
          sx={{ flex: 1, height: 48, borderRadius: "12px" }}
          data-testid="review-forgot-btn"
        >
          Chưa nhớ
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<CheckCircleRoundedIcon />}
          disabled={reviewing}
          onClick={(e) => {
            e.stopPropagation();
            handleAnswer(true);
          }}
          sx={{ flex: 1, height: 48, borderRadius: "12px" }}
          data-testid="review-remembered-btn"
        >
          Đã nhớ
        </Button>
      </Box>
    </Box>
  );
}

function QuizView({ questions }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const q = questions[idx];

  const submit = () => {
    const ns = selected === q.correct ? score + 1 : score;
    if (idx + 1 >= questions.length) {
      setScore(ns);
      setDone(true);
      return;
    }
    setScore(ns);
    setIdx((i) => i + 1);
    setSelected(null);
  };

  if (done)
    return (
      <Box textAlign="center" py={8}>
        <Typography variant="h5" fontWeight={700} mb={1}>
          Điểm: {score}/{questions.length}
        </Typography>
        <Typography color="text.secondary" mb={3}>
          {score === questions.length
            ? "Xuất sắc! Bạn trả lời đúng tất cả."
            : "Hãy ôn lại những câu chưa đúng nhé."}
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            setIdx(0);
            setSelected(null);
            setScore(0);
            setDone(false);
          }}
        >
          Làm lại
        </Button>
      </Box>
    );

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
          mb: 1.5,
          alignItems: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          Câu {idx + 1} / {questions.length}
        </Typography>
        <Chip
          label={q.subject}
          size="small"
          variant="outlined"
          sx={{
            fontWeight: 600,
            color: "primary.main",
            borderColor: "primary.main",
          }}
        />
      </Box>
      <LinearProgress
        variant="determinate"
        value={(idx / questions.length) * 100}
        sx={{ mb: 4, height: 6, borderRadius: 3 }}
      />
      <Typography variant="h6" fontWeight={600} mb={3} lineHeight={1.5}>
        {q.question}
      </Typography>
      <FormControl component="fieldset" fullWidth>
        <RadioGroup
          value={selected}
          onChange={(e) => setSelected(Number(e.target.value))}
        >
          {q.options.map((opt, i) => (
            <Paper
              key={i}
              elevation={0}
              sx={{
                mb: 1.5,
                borderRadius: "12px",
                border: "2px solid",
                borderColor: selected === i ? "primary.main" : "divider",
                bgcolor: selected === i ? "background.subtle" : "transparent",
                transition: "all 0.2s",
                "&:hover": {
                  borderColor:
                    selected === i ? "primary.main" : "text.disabled",
                },
              }}
            >
              <FormControlLabel
                value={i}
                control={<Radio />}
                label={
                  <Typography fontWeight={selected === i ? 600 : 400}>
                    {opt}
                  </Typography>
                }
                sx={{ width: "100%", py: 1, px: 2, m: 0 }}
              />
            </Paper>
          ))}
        </RadioGroup>
      </FormControl>
      <Button
        variant="contained"
        onClick={submit}
        disabled={selected === null}
        sx={{ mt: 3, height: 48, borderRadius: "10px" }}
        fullWidth
      >
        {idx + 1 >= questions.length ? "Nộp bài" : "Câu tiếp theo"}
      </Button>
    </Box>
  );
}

export default function Review() {
  const [mode, setMode] = useState("flashcard");
  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [cards, setCards] = useState([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);
  const [error, setError] = useState("");
  const [reviewing, setReviewing] = useState(false);

  // Dialog tạo bộ thẻ
  const [deckDialogOpen, setDeckDialogOpen] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [submittingDeck, setSubmittingDeck] = useState(false);

  // Dialog thêm thẻ
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const [submittingCard, setSubmittingCard] = useState(false);

  const loadDecks = useCallback(async () => {
    setLoadingDecks(true);
    setError("");
    try {
      const data = await fetchDecks();
      setDecks(data);
      setSelectedDeckId((prev) => {
        if (prev && data.some((d) => d.id === prev)) return prev;
        return data.length > 0 ? data[0].id : "";
      });
    } catch (err) {
      setError(err.message || "Không tải được danh sách bộ thẻ");
    } finally {
      setLoadingDecks(false);
    }
  }, []);

  const loadCardsForDeck = useCallback(async (deckId) => {
    if (!deckId) {
      setCards([]);
      return;
    }
    setLoadingCards(true);
    setError("");
    try {
      const data = await fetchCards(deckId);
      setCards(data);
    } catch (err) {
      setError(err.message || "Không tải được thẻ trong bộ thẻ");
    } finally {
      setLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  useEffect(() => {
    if (selectedDeckId) {
      loadCardsForDeck(selectedDeckId);
    } else {
      setCards([]);
    }
  }, [selectedDeckId, loadCardsForDeck]);

  const handleCreateDeck = async () => {
    if (!newDeckTitle.trim() || submittingDeck) return;
    setSubmittingDeck(true);
    setError("");
    try {
      const created = await createDeck(newDeckTitle.trim());
      setDecks((prev) => [created, ...prev]);
      setSelectedDeckId(created.id);
      setNewDeckTitle("");
      setDeckDialogOpen(false);
    } catch (err) {
      setError(err.message || "Không tạo được bộ thẻ");
    } finally {
      setSubmittingDeck(false);
    }
  };

  const handleDeleteDeck = async () => {
    if (!selectedDeckId || !window.confirm("Xóa bộ thẻ và toàn bộ thẻ bên trong?")) return;
    setError("");
    try {
      await deleteDeck(selectedDeckId);
      const remaining = decks.filter((d) => d.id !== selectedDeckId);
      setDecks(remaining);
      setSelectedDeckId(remaining.length > 0 ? remaining[0].id : "");
    } catch (err) {
      setError(err.message || "Không xóa được bộ thẻ");
    }
  };

  const handleCreateCard = async () => {
    if (!selectedDeckId || !frontText.trim() || !backText.trim() || submittingCard) return;
    setSubmittingCard(true);
    setError("");
    try {
      const created = await createCard(selectedDeckId, frontText.trim(), backText.trim());
      setCards((prev) => [...prev, created]);
      setDecks((prev) =>
        prev.map((d) =>
          d.id === selectedDeckId ? { ...d, cardCount: (d.cardCount || 0) + 1 } : d
        )
      );
      setFrontText("");
      setBackText("");
      setCardDialogOpen(false);
    } catch (err) {
      setError(err.message || "Không thêm được thẻ");
    } finally {
      setSubmittingCard(false);
    }
  };

  const handleReviewCard = async (cardId, remembered) => {
    setReviewing(true);
    setError("");
    try {
      const updated = await reviewCard(cardId, remembered);
      setCards((prev) => prev.map((c) => (c.id === cardId ? updated : c)));
      return true;
    } catch (err) {
      setError(err.message || "Không lưu được kết quả ôn tập");
      return false;
    } finally {
      setReviewing(false);
    }
  };

  const handleDeleteCard = async (cardId) => {
    setError("");
    try {
      await deleteCard(cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      setDecks((prev) =>
        prev.map((d) =>
          d.id === selectedDeckId
            ? { ...d, cardCount: Math.max(0, (d.cardCount || 0) - 1) }
            : d
        )
      );
    } catch (err) {
      setError(err.message || "Không xóa được thẻ");
    }
  };

  const activeDeck = decks.find((d) => d.id === selectedDeckId);

  return (
    <Box maxWidth={720} mx="auto">
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h4" fontWeight={700} mb={1}>
          Ôn tập
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Spaced repetition — hệ thống tự động sắp xếp lịch ôn cho bạn.
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 1.5, mb: 4, justifyContent: "center" }}>
        <Button
          variant={mode === "flashcard" ? "contained" : "outlined"}
          onClick={() => setMode("flashcard")}
          sx={{ borderRadius: "10px", px: 3 }}
        >
          Flashcard ({cards.length})
        </Button>
        <Button
          variant={mode === "quiz" ? "contained" : "outlined"}
          onClick={() => setMode("quiz")}
          sx={{ borderRadius: "10px", px: 3 }}
        >
          Quiz ({QUIZ.length})
        </Button>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={loadDecks}
              data-testid="flashcard-retry-btn"
            >
              Thử lại
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {mode === "flashcard" ? (
        <Stack spacing={3}>
          {/* Thanh quản lý bộ thẻ */}
          <Paper
            elevation={0}
            sx={{ p: 2, borderRadius: "16px", border: "1px solid", borderColor: "divider" }}
          >
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
              <FormControl size="small" sx={{ minWidth: 220, flex: 1 }}>
                <InputLabel id="deck-select-label">Bộ thẻ</InputLabel>
                <Select
                  labelId="deck-select-label"
                  label="Bộ thẻ"
                  value={selectedDeckId}
                  onChange={(e) => setSelectedDeckId(e.target.value)}
                  disabled={loadingDecks || decks.length === 0}
                  data-testid="deck-select"
                >
                  {decks.map((d) => (
                    <MenuItem key={d.id} value={d.id}>
                      {d.title} ({d.cardCount ?? 0} thẻ)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                startIcon={<AddRoundedIcon />}
                onClick={() => setDeckDialogOpen(true)}
                data-testid="create-deck-btn"
              >
                Tạo bộ thẻ
              </Button>
              {activeDeck && (
                <>
                  <Button
                    variant="contained"
                    startIcon={<AddRoundedIcon />}
                    onClick={() => setCardDialogOpen(true)}
                    data-testid="create-card-btn"
                  >
                    Thêm thẻ
                  </Button>
                  <IconButton
                    color="error"
                    onClick={handleDeleteDeck}
                    title="Xóa bộ thẻ"
                    data-testid="delete-deck-btn"
                  >
                    <DeleteOutlineRoundedIcon />
                  </IconButton>
                </>
              )}
            </Stack>
          </Paper>

          {/* Khung ôn tập */}
          <Card
            sx={{
              borderRadius: "20px",
              border: "1px solid",
              borderColor: "divider",
            }}
            elevation={0}
          >
            <CardContent sx={{ p: "32px !important" }}>
              {loadingDecks || loadingCards ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }} data-testid="flashcard-loading">
                  <CircularProgress />
                </Box>
              ) : decks.length === 0 ? (
                <Box textAlign="center" py={6} data-testid="empty-decks">
                  <Typography variant="h6" color="text.secondary" mb={1}>
                    Bạn chưa có bộ thẻ nào
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddRoundedIcon />}
                    onClick={() => setDeckDialogOpen(true)}
                  >
                    Tạo bộ thẻ đầu tiên
                  </Button>
                </Box>
              ) : cards.length === 0 ? (
                <Box textAlign="center" py={6} data-testid="empty-cards">
                  <Typography variant="h6" color="text.secondary" mb={1}>
                    Bộ thẻ "{activeDeck?.title}" chưa có thẻ nào
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddRoundedIcon />}
                    onClick={() => setCardDialogOpen(true)}
                  >
                    Thêm thẻ đầu tiên
                  </Button>
                </Box>
              ) : (
                <FlashcardView
                  cards={cards}
                  deckTitle={activeDeck?.title || ""}
                  onReview={handleReviewCard}
                  reviewing={reviewing}
                />
              )}
            </CardContent>
          </Card>

          {/* Danh sách thẻ trong bộ hiện tại */}
          {cards.length > 0 && (
            <Paper
              elevation={0}
              sx={{ p: 2.5, borderRadius: "16px", border: "1px solid", borderColor: "divider" }}
            >
              <Typography variant="subtitle1" fontWeight={700} mb={1.5}>
                Danh sách thẻ ({cards.length})
              </Typography>
              <Stack spacing={1}>
                {cards.map((c) => (
                  <Paper
                    key={c.id}
                    variant="outlined"
                    sx={{ p: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}
                    data-testid={`card-row-${c.id}`}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {c.frontText}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {c.backText} · Chu kỳ {c.intervalDays ?? 0} ngày
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteCard(c.id)}
                      data-testid={`delete-card-${c.id}`}
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Paper>
                ))}
              </Stack>
            </Paper>
          )}
        </Stack>
      ) : (
        <Card
          sx={{
            borderRadius: "20px",
            border: "1px solid",
            borderColor: "divider",
          }}
          elevation={0}
        >
          <CardContent sx={{ p: "32px !important" }}>
            <QuizView questions={QUIZ} />
          </CardContent>
        </Card>
      )}

      {/* Dialog tạo bộ thẻ */}
      <Dialog open={deckDialogOpen} onClose={() => !submittingDeck && setDeckDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Tạo bộ thẻ mới</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Tên bộ thẻ"
            value={newDeckTitle}
            onChange={(e) => setNewDeckTitle(e.target.value)}
            data-testid="deck-title-input"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeckDialogOpen(false)} disabled={submittingDeck}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateDeck}
            disabled={!newDeckTitle.trim() || submittingDeck}
            data-testid="save-deck-btn"
          >
            {submittingDeck ? "Đang tạo..." : "Tạo"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog thêm thẻ */}
      <Dialog open={cardDialogOpen} onClose={() => !submittingCard && setCardDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Thêm thẻ mới</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Mặt trước (Câu hỏi)"
            value={frontText}
            onChange={(e) => setFrontText(e.target.value)}
            data-testid="card-front-input"
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            margin="dense"
            label="Mặt sau (Đáp án)"
            value={backText}
            onChange={(e) => setBackText(e.target.value)}
            data-testid="card-back-input"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCardDialogOpen(false)} disabled={submittingCard}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateCard}
            disabled={!frontText.trim() || !backText.trim() || submittingCard}
            data-testid="save-card-btn"
          >
            {submittingCard ? "Đang lưu..." : "Lưu thẻ"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
