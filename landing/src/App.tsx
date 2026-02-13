import { useState } from 'react';
import { Database, BarChart3, Zap, Users, CheckCircle2, Shield, Workflow, TrendingUp, ArrowRight, Layers, Bell, Search, Link2, History, LineChart } from 'lucide-react';

export default function TripSystemLanding() {
  const [activeTab, setActiveTab] = useState('kanban');

  const features = [
    {
      id: 'kanban',
      title: 'Kanban воронка',
      description: 'Визуальное управление процессом привлечения гидов',
      icon: Workflow
    },
    {
      id: 'dashboard',
      title: 'Дашборд',
      description: 'Аналитика и ключевые метрики в реальном времени',
      icon: BarChart3
    },
    {
      id: 'tasks',
      title: 'Управление задачами',
      description: 'Создание и отслеживание задач по работе с гидами',
      icon: CheckCircle2
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Animated Background Grid */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/50 to-black"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-semibold tracking-tight">TripSystem</div>
          <a href="/app/" className="px-6 py-2 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors">
            Войти в систему
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-3 mb-6 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-sm text-white/70">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              300+ гидов уже в базе
            </div>
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              CRM для работы с гидами
            </h1>
            <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto leading-relaxed">
              Управляйте базой гидов, отслеживайте воронку привлечения и автоматизируйте процессы — всё в одной системе
            </p>
            <div className="flex gap-4 justify-center">
              <a href="/app/" className="px-8 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors flex items-center gap-2">
                Войти
                <ArrowRight className="w-4 h-4" />
              </a>
              <button className="px-8 py-3 rounded-full border border-white/10 hover:bg-white/5 transition-colors">
                Связаться с нами
              </button>
            </div>
          </div>

          {/* Hero Visual Element */}
          <div className="relative max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
            <div className="border border-white/10 rounded-2xl overflow-hidden bg-gradient-to-b from-white/5 to-transparent">
              <div className="aspect-video bg-gradient-to-br from-purple-500/10 via-transparent to-green-500/10 flex items-center justify-center">
                <div className="text-center">
                  <Layers className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/40 text-sm">Интерфейс CRM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why TripSystem Section */}
      <section className="py-20 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
              Почему TripSystem?
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Система создана с учетом специфики тревел-бизнеса и реальных потребностей команды
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <div className="border border-white/10 rounded-2xl p-8 bg-gradient-to-b from-white/5 to-transparent hover:border-white/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Адаптирован под работу с гидами</h3>
              <p className="text-white/60 leading-relaxed">
                Все процессы настроены под специфику привлечения и работы с гидами — от первого контакта до публикации туров на платформе VOYZ.
              </p>
            </div>

            <div className="border border-white/10 rounded-2xl p-8 bg-gradient-to-b from-white/5 to-transparent hover:border-white/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6">
                <CheckCircle2 className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Только нужные инструменты</h3>
              <p className="text-white/60 leading-relaxed">
                Чистый интерфейс без лишних модулей. Мы не перегружаем систему функциями, которые вам не понадобятся — только то, что действительно работает.
              </p>
            </div>

            <div className="border border-white/10 rounded-2xl p-8 bg-gradient-to-b from-white/5 to-transparent hover:border-white/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6">
                <Link2 className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Связь сделок и задач</h3>
              <p className="text-white/60 leading-relaxed">
                Система автоматически напомнит о созвоне, запросе материалов или любой другой задаче. Ничего не потеряется и не будет забыто.
              </p>
            </div>

            <div className="border border-white/10 rounded-2xl p-8 bg-gradient-to-b from-white/5 to-transparent hover:border-white/20 transition-all">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-6">
                <Layers className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Прозрачная система</h3>
              <p className="text-white/60 leading-relaxed">
                Интуитивно понятная структура — от воронки сделок до дашбордов. Вся команда понимает, что происходит, с первого взгляда.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-20 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
              Ключевые возможности CRM
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Всё необходимое для эффективного управления процессом привлечения гидов
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Workflow className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Kanban воронка сделок</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Визуально отслеживайте каждого гида на всех этапах: от первого контакта до публикации туров. Перетаскивайте карточки, меняйте статус.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Database className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">База гидов</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Централизованное хранение всех данных: контакты, направления, статусы, история взаимодействий. Мощный поиск и фильтрация.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Система задач</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Создавайте задачи прямо из карточки гида: «Напомнить о созвоне в 15:00», «Запросить фото для профиля», «Отправить гайд по оформлению». Система напомнит в нужное время.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Связь задач со сделками</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Все задачи автоматически привязаны к конкретному гиду. Видите контекст, не теряете важные детали, не забываете о договорённостях.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Realtime обновления</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  WebSocket соединение обеспечивает мгновенное обновление данных для всей команды. Изменения видны всем сразу.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <History className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">История взаимодействий</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Полная история общения с каждым гидом: когда связывались, что обсуждали, какие материалы отправляли.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Умные напоминания</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Система сама напомнит о дедлайнах, просроченных задачах и важных событиях. Ничего не упустите.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Search className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Быстрый поиск</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  Находите нужного гида или задачу за секунды. Поиск работает по всем полям: имя, локация, направление, статус.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white/80" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Безопасность данных</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  JWT-аутентификация, ролевой доступ для команды, защищённое хранение контактов гидов.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase with Tabs */}
      <section className="py-20 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
              Интерфейс системы
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Современный и интуитивно понятный интерфейс для эффективной работы
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 max-w-3xl mx-auto border border-white/10 rounded-xl p-1 bg-white/5">
            {features.map(feature => {
              const Icon = feature.icon;
              return (
                <button
                  key={feature.id}
                  onClick={() => setActiveTab(feature.id)}
                  className={`flex-1 px-6 py-3 rounded-lg transition-all ${
                    activeTab === feature.id
                      ? 'bg-white text-black'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="font-medium text-sm">{feature.title}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="max-w-5xl mx-auto">
            <div className="border border-white/10 rounded-2xl overflow-hidden bg-gradient-to-b from-white/5 to-transparent">
              <div className="aspect-video bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 flex items-center justify-center p-12">
                <div className="text-center">
                  {activeTab === 'kanban' && (
                    <div className="space-y-4">
                      <Workflow className="w-16 h-16 text-white/20 mx-auto" />
                      <h3 className="text-2xl font-semibold">Kanban воронка</h3>
                      <p className="text-white/60 max-w-md mx-auto">
                        Визуально отслеживайте статус каждого гида в процессе привлечения.
                        Перетаскивайте карточки между колонками, назначайте задачи и следите за прогрессом.
                      </p>
                    </div>
                  )}
                  {activeTab === 'dashboard' && (
                    <div className="space-y-4">
                      <BarChart3 className="w-16 h-16 text-white/20 mx-auto" />
                      <h3 className="text-2xl font-semibold">Дашборд</h3>
                      <p className="text-white/60 max-w-md mx-auto">
                        Следите за ключевыми метриками в реальном времени: конверсия, активные задачи,
                        воронка продаж и тренды роста.
                      </p>
                    </div>
                  )}
                  {activeTab === 'tasks' && (
                    <div className="space-y-4">
                      <CheckCircle2 className="w-16 h-16 text-white/20 mx-auto" />
                      <h3 className="text-2xl font-semibold">Управление задачами</h3>
                      <p className="text-white/60 max-w-md mx-auto">
                        Создавайте задачи, назначайте исполнителей, устанавливайте дедлайны
                        и получайте уведомления о важных событиях.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-20 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
              Продукты TripSystem
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              Экосистема инструментов для управления тревел-бизнесом
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* CRM Product */}
            <div className="group relative border border-white/10 rounded-2xl p-8 bg-gradient-to-b from-white/5 to-transparent hover:border-white/20 transition-all">
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium">
                  Доступно
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-white/10 transition-colors">
                <Database className="w-6 h-6 text-white/80" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">CRM для работы с гидами</h3>
              <p className="text-white/60 leading-relaxed mb-6">
                Полноценная система для управления базой гидов, воронкой привлечения, задачами и аналитикой.
                Адаптирована под специфику тревел-бизнеса.
              </p>
              <a href="/app/" className="inline-block px-6 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-sm">
                Войти в CRM
              </a>
            </div>

            {/* Analytics Product */}
            <div className="group relative border border-white/10 rounded-2xl p-8 bg-gradient-to-b from-white/5 to-transparent hover:border-white/20 transition-all">
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                  Скоро
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:bg-white/10 transition-colors">
                <BarChart3 className="w-6 h-6 text-white/80" />
              </div>
              <h3 className="text-2xl font-semibold mb-3">Аналитика</h3>
              <p className="text-white/60 leading-relaxed mb-6">
                Глубокая аналитика для принятия решений на основе данных:
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <LineChart className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-white/90 mb-1">Сквозная аналитика</div>
                    <div className="text-sm text-white/60">От первого касания гида до его продаж на платформе VOYZ</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-white/90 mb-1">Сегментация по направлениям</div>
                    <div className="text-sm text-white/60">Анализ эффективности по локациям и специализациям гидов</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-white/90 mb-1">Аналитика по менеджерам</div>
                    <div className="text-sm text-white/60">Сколько гидов привлёк каждый менеджер, конверсии и эффективность</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-white/90 mb-1">Фокус на нужных метриках</div>
                    <div className="text-sm text-white/60">Только действительно важные показатели без перегрузки лишними данными</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-20 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 tracking-tight">
              Современные технологии
            </h2>
            <p className="text-lg text-white/60 leading-relaxed mb-8">
              Построено на передовом стеке: <span className="text-white/80 font-medium">React 19, NestJS, PostgreSQL, WebSocket</span>
            </p>
            <p className="text-white/60">
              Быстро, безопасно, масштабируемо
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mx-auto text-center border border-white/10 rounded-3xl p-12 bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5"></div>
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-tight">
                Готовы начать?
              </h2>
              <p className="text-lg text-white/60 mb-8">
                Войдите в систему и начните эффективно управлять процессом привлечения гидов
              </p>
              <a href="/app/" className="px-8 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors inline-flex items-center gap-2">
                Войти в систему
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-white/40">
              &copy; 2025 TripSystem. Все права защищены.
            </div>
            <div className="flex gap-6 text-sm text-white/60">
              <a href="#" className="hover:text-white transition-colors">Контакты</a>
              <a href="#" className="hover:text-white transition-colors">Поддержка</a>
              <a href="#" className="hover:text-white transition-colors">Документация</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
